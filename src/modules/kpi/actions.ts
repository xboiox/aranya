"use server"
import { auth, hasRole } from "@/lib/auth"
import { withTenantContext } from "@/lib/db"
import { kpiEvaluations, employees } from "@/lib/db/schema"
import { logAudit } from "@/lib/audit"
import { notify } from "@/lib/notifications"
import { isModuleActive } from "@/lib/modules"
import {
  resolveApprovers,
  decideApproval,
  type ActionState,
  type ApprovalDecision,
} from "@/lib/approval"
import { submitKpiSchema } from "./schema"
import { eq, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"

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

export async function submitKpi(_prev: ActionState, formData: FormData): Promise<ActionState> {
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
  decision: ApprovalDecision,
  rejectionReason?: string,
): Promise<ActionState> {
  const c = await ctx()
  if ("error" in c) return { error: c.error }
  const { session, tenantId } = c

  return decideApproval({
    tenantId,
    actor: { userId: session.user.id, isHr: hasRole(session.user.roles, "hr_admin") },
    id,
    decision,
    rejectionReason,
    entityType: "kpi_evaluation",
    auditAction: { approved: "kpi.approve", rejected: "kpi.reject" },
    successMessage: { approved: "KPI disetujui", rejected: "KPI ditolak" },
    revalidate: ["/dashboard/kpi/approvals", "/dashboard/kpi"],
    load: (tx, recordId) =>
      tx.query.kpiEvaluations.findFirst({ where: eq(kpiEvaluations.id, recordId) }),
    update: async (tx, recordId, patch) => {
      await tx.update(kpiEvaluations).set(patch).where(eq(kpiEvaluations.id, recordId))
    },
    notification: (ev, dec, reason) => ({
      type: `kpi_${dec}`,
      title: dec === "approved" ? "KPI disetujui" : "KPI ditolak",
      body:
        dec === "approved"
          ? `Penilaian KPI ${ev.period} Anda disetujui (nilai ${ev.score}).`
          : `Penilaian KPI ${ev.period} Anda ditolak.${reason ? ` Alasan: ${reason}` : ""}`,
      data: { kpiEvaluationId: ev.id },
    }),
  })
}

export async function approveKpi(id: string): Promise<ActionState> {
  return decide(id, "approved")
}

export async function rejectKpi(id: string, reason: string): Promise<ActionState> {
  return decide(id, "rejected", reason)
}
