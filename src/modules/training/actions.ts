"use server"
import { auth, hasRole } from "@/lib/auth"
import { withTenantContext } from "@/lib/db"
import { trainingRecords, employees } from "@/lib/db/schema"
import { logAudit } from "@/lib/audit"
import { isModuleActive } from "@/lib/modules"
import { parseDateOnly } from "@/lib/date"
import { trainingSchema } from "./schema"
import { eq, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"

type State = { error?: string; success?: string }

async function requireHrWithModule() {
  const session = await auth()
  if (!session) return { error: "Tidak terautentikasi" as const }
  const tenantId = session.user.tenantId
  if (!hasRole(session.user.roles, "hr_admin") || !tenantId) {
    return { error: "Hanya HR Admin yang dapat mengelola training" as const }
  }
  if (!(await isModuleActive(tenantId, "MODULE_2"))) {
    return { error: "Modul HR Operations & Performance belum aktif" as const }
  }
  return { tenantId, userId: session.user.id }
}

export async function createTraining(_prev: State, formData: FormData): Promise<State> {
  const ctx = await requireHrWithModule()
  if ("error" in ctx) return { error: ctx.error }

  const parsed = trainingSchema.safeParse({
    employeeId: formData.get("employeeId"),
    title: formData.get("title"),
    type: formData.get("type"),
    provider: formData.get("provider"),
    startDate: formData.get("startDate"),
    completionDate: formData.get("completionDate"),
    expiryDate: formData.get("expiryDate"),
    status: formData.get("status"),
    notes: formData.get("notes"),
  })
  if (!parsed.success) return { error: parsed.error.errors[0].message }
  const d = parsed.data

  const result = await withTenantContext(ctx.tenantId, async (tx) => {
    const emp = await tx.query.employees.findFirst({ where: eq(employees.id, d.employeeId) })
    if (!emp) return { error: "Karyawan tidak ditemukan" as string }

    await tx.insert(trainingRecords).values({
      tenantId: ctx.tenantId,
      employeeId: d.employeeId,
      title: d.title,
      type: d.type,
      provider: d.provider ?? null,
      startDate: parseDateOnly(d.startDate ?? "") ?? null,
      completionDate: parseDateOnly(d.completionDate ?? "") ?? null,
      expiryDate: parseDateOnly(d.expiryDate ?? "") ?? null,
      status: d.status,
      notes: d.notes ?? null,
    })
    return { ok: true }
  })

  if ("error" in result) return { error: result.error }

  await logAudit({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: "training.create",
    entityType: "training",
    newValues: { title: d.title, type: d.type },
  })

  revalidatePath("/dashboard/training/manage")
  return { success: "Training ditambahkan" }
}

export async function deleteTraining(id: string): Promise<State> {
  const ctx = await requireHrWithModule()
  if ("error" in ctx) return { error: ctx.error }

  await withTenantContext(ctx.tenantId, async (tx) => {
    await tx
      .delete(trainingRecords)
      .where(and(eq(trainingRecords.id, id), eq(trainingRecords.tenantId, ctx.tenantId)))
  })

  await logAudit({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: "training.delete",
    entityType: "training",
    entityId: id,
  })

  revalidatePath("/dashboard/training/manage")
  return { success: "Training dihapus" }
}
