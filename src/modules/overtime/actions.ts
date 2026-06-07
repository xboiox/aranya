"use server"
import { auth, hasRole } from "@/lib/auth"
import { withTenantContext } from "@/lib/db"
import { overtimeRequests, employees, userRoles, roles } from "@/lib/db/schema"
import { logAudit } from "@/lib/audit"
import { notify } from "@/lib/notifications"
import { parseDateOnly, todayJakarta } from "@/lib/date"
import { computeDurationMinutes, formatMinutes } from "@/lib/time"
import { requestOvertimeSchema } from "./schema"
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

export async function requestOvertime(_prev: State, formData: FormData): Promise<State> {
  const c = await ctx()
  if ("error" in c) return { error: c.error }
  const { session, tenantId } = c

  const parsed = requestOvertimeSchema.safeParse({
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    reason: formData.get("reason"),
  })
  if (!parsed.success) return { error: parsed.error.errors[0].message }
  const data = parsed.data

  const date = parseDateOnly(data.date)
  if (!date) return { error: "Tanggal tidak valid" }
  if (date > todayJakarta()) {
    return { error: "Tidak dapat mencatat lembur untuk tanggal di masa depan" }
  }

  const durationMinutes = computeDurationMinutes(data.startTime, data.endTime)
  if (durationMinutes == null) {
    return { error: "Durasi lembur tidak valid (cek jam mulai & selesai)" }
  }

  const employeeId = await withTenantContext(tenantId, async (tx) => {
    const emp = await tx.query.employees.findFirst({
      where: eq(employees.userId, session.user.id),
    })
    return emp?.id ?? null
  })
  if (!employeeId) return { error: "Data karyawan tidak ditemukan" }

  const [created] = await withTenantContext(tenantId, async (tx) =>
    tx
      .insert(overtimeRequests)
      .values({
        tenantId,
        employeeId,
        date,
        startTime: data.startTime,
        endTime: data.endTime,
        durationMinutes,
        reason: data.reason ?? null,
      })
      .returning(),
  )

  await logAudit({
    tenantId,
    userId: session.user.id,
    action: "overtime.request",
    entityType: "overtime_request",
    entityId: created.id,
    newValues: { durationMinutes },
  })

  const approvers = await resolveApprovers(tenantId, employeeId)
  await Promise.all(
    approvers.map((userId) =>
      notify({
        tenantId,
        userId,
        type: "overtime_request",
        title: "Pengajuan lembur baru",
        body: `${session.user.name ?? "Karyawan"} mengajukan lembur ${formatMinutes(durationMinutes)}. Menunggu persetujuan Anda.`,
        data: { overtimeRequestId: created.id },
      }),
    ),
  )

  revalidatePath("/dashboard/overtime")
  return { success: "Pengajuan lembur terkirim" }
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
    const req = await tx.query.overtimeRequests.findFirst({
      where: eq(overtimeRequests.id, id),
    })
    if (!req) return { error: "Pengajuan tidak ditemukan" as string }
    if (req.status !== "pending") return { error: "Pengajuan sudah diproses" }

    const requester = await tx.query.employees.findFirst({
      where: eq(employees.id, req.employeeId),
    })
    if (!requester) return { error: "Data pemohon tidak ditemukan" }

    const me = await tx.query.employees.findFirst({
      where: eq(employees.userId, session.user.id),
    })
    const isDirectLead = me && requester.reportsToId === me.id
    if (!isDirectLead && !isHr) return { error: "Anda tidak berwenang memproses pengajuan ini" }
    if (requester.userId === session.user.id) {
      return { error: "Anda tidak dapat menyetujui pengajuan sendiri" }
    }

    await tx
      .update(overtimeRequests)
      .set({
        status: decision,
        approverId: session.user.id,
        decidedAt: new Date(),
        rejectionReason: decision === "rejected" ? (rejectionReason ?? null) : null,
        updatedAt: new Date(),
      })
      .where(eq(overtimeRequests.id, id))

    return { req, requesterUserId: requester.userId }
  })

  if ("error" in result) return { error: result.error }

  await logAudit({
    tenantId,
    userId: session.user.id,
    action: decision === "approved" ? "overtime.approve" : "overtime.reject",
    entityType: "overtime_request",
    entityId: id,
  })

  await notify({
    tenantId,
    userId: result.requesterUserId,
    type: `overtime_${decision}`,
    title: decision === "approved" ? "Lembur disetujui" : "Lembur ditolak",
    body:
      decision === "approved"
        ? `Pengajuan lembur ${formatMinutes(result.req.durationMinutes)} Anda disetujui.`
        : `Pengajuan lembur Anda ditolak.${rejectionReason ? ` Alasan: ${rejectionReason}` : ""}`,
    data: { overtimeRequestId: id },
  })

  revalidatePath("/dashboard/overtime/approvals")
  revalidatePath("/dashboard/overtime")
  return { success: decision === "approved" ? "Lembur disetujui" : "Lembur ditolak" }
}

export async function approveOvertime(id: string): Promise<State> {
  return decide(id, "approved")
}

export async function rejectOvertime(id: string, reason: string): Promise<State> {
  return decide(id, "rejected", reason)
}

export async function cancelOvertime(id: string): Promise<State> {
  const c = await ctx()
  if ("error" in c) return { error: c.error }
  const { session, tenantId } = c

  const result = await withTenantContext(tenantId, async (tx) => {
    const me = await tx.query.employees.findFirst({
      where: eq(employees.userId, session.user.id),
    })
    if (!me) return { error: "Data karyawan tidak ditemukan" as string }
    const req = await tx.query.overtimeRequests.findFirst({
      where: eq(overtimeRequests.id, id),
    })
    if (!req) return { error: "Pengajuan tidak ditemukan" }
    if (req.employeeId !== me.id) return { error: "Anda hanya dapat membatalkan pengajuan sendiri" }
    if (req.status !== "pending") return { error: "Hanya pengajuan menunggu yang bisa dibatalkan" }

    await tx
      .update(overtimeRequests)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(overtimeRequests.id, id))
    return { ok: true }
  })

  if ("error" in result) return { error: result.error }

  await logAudit({
    tenantId,
    userId: session.user.id,
    action: "overtime.cancel",
    entityType: "overtime_request",
    entityId: id,
  })

  revalidatePath("/dashboard/overtime")
  return { success: "Pengajuan dibatalkan" }
}
