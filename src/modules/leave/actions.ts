"use server"
import { auth, hasRole } from "@/lib/auth"
import { withTenantContext } from "@/lib/db"
import { leaveRequests, employees, userRoles, roles } from "@/lib/db/schema"
import { logAudit } from "@/lib/audit"
import { notify } from "@/lib/notifications"
import { countWorkingDays, parseDateOnly } from "@/lib/date"
import { requestLeaveSchema, affectsQuota, leaveTypeLabel } from "./schema"
import { getLeaveBalance } from "./queries"
import { eq, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"

type State = { error?: string; success?: string }

async function ctx() {
  const session = await auth()
  if (!session) return { error: "Tidak terautentikasi" as const }
  const tenantId = session.user.tenantId
  if (!tenantId) return { error: "Akun tidak terhubung ke perusahaan" as const }
  return { session, tenantId }
}

// Resolusi penerima notifikasi approval: direct lead, atau fallback semua HR Admin
async function resolveApprovers(
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
    // Fallback: semua HR Admin tenant
    const hrUsers = await tx
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(and(eq(userRoles.tenantId, tenantId), eq(roles.name, "hr_admin")))
    return hrUsers.map((u) => u.userId)
  })
}

export async function requestLeave(_prev: State, formData: FormData): Promise<State> {
  const c = await ctx()
  if ("error" in c) return { error: c.error }
  const { session, tenantId } = c

  const parsed = requestLeaveSchema.safeParse({
    type: formData.get("type"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    reason: formData.get("reason"),
  })
  if (!parsed.success) return { error: parsed.error.errors[0].message }
  const data = parsed.data

  const start = parseDateOnly(data.startDate)
  const end = parseDateOnly(data.endDate)
  if (!start || !end) return { error: "Tanggal tidak valid" }

  const totalDays = countWorkingDays(start, end)
  if (totalDays === 0) {
    return { error: "Rentang tanggal tidak mengandung hari kerja" }
  }

  const employeeId = await withTenantContext(tenantId, async (tx) => {
    const emp = await tx.query.employees.findFirst({
      where: eq(employees.userId, session.user.id),
    })
    return emp?.id ?? null
  })
  if (!employeeId) return { error: "Data karyawan tidak ditemukan" }

  // Cek saldo untuk cuti tahunan
  if (affectsQuota(data.type)) {
    const balance = await getLeaveBalance(tenantId, employeeId)
    if (totalDays > balance.remaining) {
      return {
        error: `Saldo cuti tahunan tidak cukup (sisa ${balance.remaining} hari, diminta ${totalDays} hari)`,
      }
    }
  }

  const [created] = await withTenantContext(tenantId, async (tx) =>
    tx
      .insert(leaveRequests)
      .values({
        tenantId,
        employeeId,
        type: data.type,
        startDate: start,
        endDate: end,
        totalDays,
        reason: data.reason ?? null,
      })
      .returning(),
  )

  await logAudit({
    tenantId,
    userId: session.user.id,
    action: "leave.request",
    entityType: "leave_request",
    entityId: created.id,
    newValues: { type: data.type, totalDays },
  })

  const approvers = await resolveApprovers(tenantId, employeeId)
  await Promise.all(
    approvers.map((userId) =>
      notify({
        tenantId,
        userId,
        type: "leave_request",
        title: "Pengajuan cuti baru",
        body: `${session.user.name ?? "Karyawan"} mengajukan ${leaveTypeLabel(data.type)} ${totalDays} hari. Menunggu persetujuan Anda.`,
        data: { leaveRequestId: created.id },
      }),
    ),
  )

  revalidatePath("/dashboard/leave")
  return { success: "Pengajuan cuti terkirim" }
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
    const req = await tx.query.leaveRequests.findFirst({
      where: eq(leaveRequests.id, id),
    })
    if (!req) return { error: "Pengajuan tidak ditemukan" as string }
    if (req.status !== "pending") return { error: "Pengajuan sudah diproses" }

    const requester = await tx.query.employees.findFirst({
      where: eq(employees.id, req.employeeId),
    })
    if (!requester) return { error: "Data pemohon tidak ditemukan" }

    // Approver = manajer langsung pemohon (myEmployeeId) ATAU HR Admin
    const me = await tx.query.employees.findFirst({
      where: eq(employees.userId, session.user.id),
    })
    const isDirectLead = me && requester.reportsToId === me.id
    if (!isDirectLead && !isHr) return { error: "Anda tidak berwenang memproses pengajuan ini" }
    if (requester.userId === session.user.id) {
      return { error: "Anda tidak dapat menyetujui pengajuan sendiri" }
    }

    await tx
      .update(leaveRequests)
      .set({
        status: decision,
        approverId: session.user.id,
        decidedAt: new Date(),
        rejectionReason: decision === "rejected" ? (rejectionReason ?? null) : null,
        updatedAt: new Date(),
      })
      .where(eq(leaveRequests.id, id))

    return { req, requesterUserId: requester.userId }
  })

  if ("error" in result) return { error: result.error }

  await logAudit({
    tenantId,
    userId: session.user.id,
    action: decision === "approved" ? "leave.approve" : "leave.reject",
    entityType: "leave_request",
    entityId: id,
  })

  await notify({
    tenantId,
    userId: result.requesterUserId,
    type: `leave_${decision}`,
    title: decision === "approved" ? "Cuti disetujui" : "Cuti ditolak",
    body:
      decision === "approved"
        ? `Pengajuan ${leaveTypeLabel(result.req.type)} ${result.req.totalDays} hari Anda disetujui.`
        : `Pengajuan ${leaveTypeLabel(result.req.type)} Anda ditolak.${rejectionReason ? ` Alasan: ${rejectionReason}` : ""}`,
    data: { leaveRequestId: id },
  })

  revalidatePath("/dashboard/leave/approvals")
  revalidatePath("/dashboard/leave")
  return { success: decision === "approved" ? "Pengajuan disetujui" : "Pengajuan ditolak" }
}

export async function approveLeave(id: string): Promise<State> {
  return decide(id, "approved")
}

export async function rejectLeave(id: string, reason: string): Promise<State> {
  return decide(id, "rejected", reason)
}
