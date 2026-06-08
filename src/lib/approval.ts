import { withTenantContext, type Database } from "@/lib/db"
import { employees, userRoles, roles } from "@/lib/db/schema"
import { logAudit } from "@/lib/audit"
import { notify } from "@/lib/notifications"
import { authorizeApproval } from "@/lib/approval-auth"
import { eq, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export type ApprovalDecision = "approved" | "rejected"
export type ActionState = { error?: string; success?: string }

/** Bentuk minimal record yang dapat diproses engine approval. */
export interface ApprovableRecord {
  id: string
  employeeId: string
  status: string
}

/** Patch standar yang diterapkan ke record saat keputusan dibuat. */
export interface ApprovalPatch {
  status: ApprovalDecision
  approverId: string
  decidedAt: Date
  rejectionReason: string | null
  updatedAt: Date
}

export interface ApprovalNotification {
  type: string
  title: string
  body: string
  data?: unknown
}

export interface DecideApprovalConfig<T extends ApprovableRecord> {
  tenantId: string
  /** Aktor yang memproses (dari sesi). */
  actor: { userId: string; isHr: boolean }
  id: string
  decision: ApprovalDecision
  rejectionReason?: string
  /** entityType untuk audit log, mis. "leave_request". */
  entityType: string
  /** Nama aksi audit per keputusan, mis. { approved: "leave.approve", rejected: "leave.reject" }. */
  auditAction: Record<ApprovalDecision, string>
  /** Pesan sukses yang dikembalikan ke UI per keputusan. */
  successMessage: Record<ApprovalDecision, string>
  /** Path yang di-revalidate setelah keputusan. */
  revalidate: string[]
  /** Ambil record berdasarkan id (dalam tx ber-tenant). */
  load: (tx: Database, id: string) => Promise<T | undefined>
  /** Terapkan patch keputusan ke record (dalam tx ber-tenant). */
  update: (tx: Database, id: string, patch: ApprovalPatch) => Promise<void>
  /** Bangun notifikasi untuk pemohon berdasarkan record & keputusan. */
  notification: (
    record: T,
    decision: ApprovalDecision,
    reason?: string,
  ) => ApprovalNotification
}

/**
 * Resolusi penerima notifikasi approval: manajer langsung pemohon,
 * atau fallback ke semua HR Admin tenant.
 */
export async function resolveApprovers(
  tenantId: string,
  requesterEmployeeId: string,
): Promise<string[]> {
  return withTenantContext(tenantId, async (tx) => {
    const requester = await tx.query.employees.findFirst({
      where: eq(employees.id, requesterEmployeeId),
    })
    if (requester?.reportsToId) {
      const lead = await tx.query.employees.findFirst({
        where: eq(employees.id, requester.reportsToId),
      })
      if (lead) return [lead.userId]
    }
    const hrUsers = await tx
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(and(eq(userRoles.tenantId, tenantId), eq(roles.name, "hr_admin")))
    return hrUsers.map((u) => u.userId)
  })
}

/**
 * Engine approval generik dipakai lintas modul (cuti, lembur, KPI).
 * Menerapkan aturan otorisasi yang sama: hanya manajer langsung atau HR Admin,
 * dan larangan menyetujui pengajuan sendiri. Lalu audit + notifikasi + revalidate.
 */
export async function decideApproval<T extends ApprovableRecord>(
  config: DecideApprovalConfig<T>,
): Promise<ActionState> {
  const { tenantId, actor, id, decision, rejectionReason } = config

  const result = await withTenantContext(tenantId, async (tx) => {
    const record = await config.load(tx, id)
    if (!record) return { error: "Pengajuan tidak ditemukan" as string }
    if (record.status !== "pending") return { error: "Pengajuan sudah diproses" }

    const requester = await tx.query.employees.findFirst({
      where: eq(employees.id, record.employeeId),
    })
    if (!requester) return { error: "Data pemohon tidak ditemukan" }

    const me = await tx.query.employees.findFirst({
      where: eq(employees.userId, actor.userId),
    })
    const authError = authorizeApproval({
      requesterUserId: requester.userId,
      requesterReportsToId: requester.reportsToId,
      actorUserId: actor.userId,
      actorEmployeeId: me?.id ?? null,
      actorIsHr: actor.isHr,
    })
    if (authError) return { error: authError }

    await config.update(tx, id, {
      status: decision,
      approverId: actor.userId,
      decidedAt: new Date(),
      rejectionReason: decision === "rejected" ? (rejectionReason ?? null) : null,
      updatedAt: new Date(),
    })

    return { record, requesterUserId: requester.userId }
  })

  if ("error" in result) return { error: result.error }

  await logAudit({
    tenantId,
    userId: actor.userId,
    action: config.auditAction[decision],
    entityType: config.entityType,
    entityId: id,
  })

  const n = config.notification(result.record, decision, rejectionReason)
  await notify({
    tenantId,
    userId: result.requesterUserId,
    type: n.type,
    title: n.title,
    body: n.body,
    data: n.data,
  })

  for (const path of config.revalidate) revalidatePath(path)
  return { success: config.successMessage[decision] }
}
