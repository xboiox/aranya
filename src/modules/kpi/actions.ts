"use server"
import { auth, hasRole } from "@/lib/auth"
import { withTenantContext } from "@/lib/db"
import { kpiEvaluations, employees, userRoles, roles } from "@/lib/db/schema"
import { logAudit } from "@/lib/audit"
import { notify } from "@/lib/notifications"
import { isModuleActive } from "@/lib/modules"
import { submitKpiSchema } from "./schema"
import { eq, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"

type State = { error?: string; success?: string }

async function ctx() {
  const session = await auth()
  if (!session) return { error: "Tidak terautentikasi" as const }
  const tenantId = session.user.tenantId
  if (!tenantId) return { error: "Akun tidak terhubung ke perusahaan" as const }
  if (!(await isModuleActive(tenantId, "MODULE_2"))) {
    return { error: "Modul HR Operations & Performance belum aktif" as const }
  }
  return { session, tenantId }
}

async function resolveApprovers(tenantId: string, requesterEmployeeId: string): Promise<string[]> {
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

export async function submitKpi(_prev: State, formData: FormData): Promise<State> {
  const c = await ctx()
  if ("error" in c) return { error: c.error }
  const { session, tenantId } = c

  const parsed = submitKpiSchema.safeParse({
    period: formData.get("period"),
    score: formData.get("score"),
    notes: formData.get("notes"),
  })
  if (!parsed.success) return { error: parsed.error.errors[0].message }
  const data = parsed.data

  const employeeId = await withTenantContext(tenantId, async (tx) => {
    const emp = await tx.query.employees.findFirst({
      where: eq(employees.userId, session.user.id),
    })
    return emp?.id ?? null
  })
  if (!employeeId) return { error: "Data karyawan tidak ditemukan" }

  const result = await withTenantContext(tenantId, async (tx) => {
    const existing = await tx.query.kpiEvaluations.findFirst({
      where: and(
        eq(kpiEvaluations.employeeId, employeeId),
        eq(kpiEvaluations.period, data.period),
      ),
    })
    if (existing && existing.status !== "rejected") {
      return { error: "Penilaian untuk periode ini sudah diajukan" as string }
    }

    if (existing) {
      // Ajukan ulang periode yang sebelumnya ditolak.
      const [updated] = await tx
        .update(kpiEvaluations)
        .set({
          score: data.score,
          notes: data.notes ?? null,
          status: "pending",
          approverId: null,
          decidedAt: null,
          rejectionReason: null,
          updatedAt: new Date(),
        })
        .where(eq(kpiEvaluations.id, existing.id))
        .returning()
      return { created: updated }
    }

    const [created] = await tx
      .insert(kpiEvaluations)
      .values({
        tenantId,
        employeeId,
        period: data.period,
        score: data.score,
        notes: data.notes ?? null,
      })
      .returning()
    return { created }
  })

  if ("error" in result) return { error: result.error }
  const created = result.created

  await logAudit({
    tenantId,
    userId: session.user.id,
    action: "kpi.submit",
    entityType: "kpi_evaluation",
    entityId: created.id,
    newValues: { period: created.period, score: created.score },
  })

  const approvers = await resolveApprovers(tenantId, employeeId)
  await Promise.all(
    approvers.map((userId) =>
      notify({
        tenantId,
        userId,
        type: "kpi_submit",
        title: "Penilaian KPI baru",
        body: `${session.user.name ?? "Karyawan"} mengajukan KPI ${created.period} (nilai ${created.score}). Menunggu persetujuan Anda.`,
        data: { kpiEvaluationId: created.id },
      }),
    ),
  )

  revalidatePath("/dashboard/kpi")
  return { success: "Penilaian KPI terkirim" }
}

async function decide(
  id: string,
  decision: "approved" | "rejected",
  rejectionReason?: string,
): Promise<State> {
  const c = await ctx()
  if ("error" in c) return { error: c.error }
  const { session, tenantId } = c
  const isHr = hasRole(session.user.roles, "hr_admin")

  const result = await withTenantContext(tenantId, async (tx) => {
    const ev = await tx.query.kpiEvaluations.findFirst({
      where: eq(kpiEvaluations.id, id),
    })
    if (!ev) return { error: "Penilaian tidak ditemukan" as string }
    if (ev.status !== "pending") return { error: "Penilaian sudah diproses" }

    const requester = await tx.query.employees.findFirst({
      where: eq(employees.id, ev.employeeId),
    })
    if (!requester) return { error: "Data pemohon tidak ditemukan" }

    const me = await tx.query.employees.findFirst({
      where: eq(employees.userId, session.user.id),
    })
    const isDirectLead = me && requester.reportsToId === me.id
    if (!isDirectLead && !isHr) return { error: "Anda tidak berwenang memproses penilaian ini" }
    if (requester.userId === session.user.id) {
      return { error: "Anda tidak dapat menyetujui penilaian sendiri" }
    }

    await tx
      .update(kpiEvaluations)
      .set({
        status: decision,
        approverId: session.user.id,
        decidedAt: new Date(),
        rejectionReason: decision === "rejected" ? (rejectionReason ?? null) : null,
        updatedAt: new Date(),
      })
      .where(eq(kpiEvaluations.id, id))

    return { ev, requesterUserId: requester.userId }
  })

  if ("error" in result) return { error: result.error }

  await logAudit({
    tenantId,
    userId: session.user.id,
    action: decision === "approved" ? "kpi.approve" : "kpi.reject",
    entityType: "kpi_evaluation",
    entityId: id,
  })

  await notify({
    tenantId,
    userId: result.requesterUserId,
    type: `kpi_${decision}`,
    title: decision === "approved" ? "KPI disetujui" : "KPI ditolak",
    body:
      decision === "approved"
        ? `Penilaian KPI ${result.ev.period} Anda disetujui (nilai ${result.ev.score}).`
        : `Penilaian KPI ${result.ev.period} Anda ditolak.${rejectionReason ? ` Alasan: ${rejectionReason}` : ""}`,
    data: { kpiEvaluationId: id },
  })

  revalidatePath("/dashboard/kpi/approvals")
  revalidatePath("/dashboard/kpi")
  return { success: decision === "approved" ? "KPI disetujui" : "KPI ditolak" }
}

export async function approveKpi(id: string): Promise<State> {
  return decide(id, "approved")
}

export async function rejectKpi(id: string, reason: string): Promise<State> {
  return decide(id, "rejected", reason)
}
