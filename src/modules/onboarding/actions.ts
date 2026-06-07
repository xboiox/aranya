"use server"
import { auth, hasRole } from "@/lib/auth"
import { withTenantContext, type Database } from "@/lib/db"
import { onboardingTasks, employees } from "@/lib/db/schema"
import { logAudit } from "@/lib/audit"
import { isModuleActive } from "@/lib/modules"
import { addTaskSchema, DEFAULT_CHECKLIST, isChecklistType, type ChecklistType } from "./schema"
import { eq, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"

type State = { error?: string; success?: string }

async function requireHrWithModule() {
  const session = await auth()
  if (!session) return { error: "Tidak terautentikasi" as const }
  const tenantId = session.user.tenantId
  if (!hasRole(session.user.roles, "hr_admin") || !tenantId) {
    return { error: "Hanya HR Admin yang dapat mengelola checklist" as const }
  }
  if (!(await isModuleActive(tenantId, "MODULE_2"))) {
    return { error: "Modul HR Operations & Performance belum aktif" as const }
  }
  return { tenantId, userId: session.user.id }
}

async function assertEmployee(tx: Database, tenantId: string, employeeId: string) {
  const emp = await tx.query.employees.findFirst({
    where: and(eq(employees.id, employeeId), eq(employees.tenantId, tenantId)),
  })
  return !!emp
}

export async function addChecklistTask(_prev: State, formData: FormData): Promise<State> {
  const ctx = await requireHrWithModule()
  if ("error" in ctx) return { error: ctx.error }

  const parsed = addTaskSchema.safeParse({
    employeeId: formData.get("employeeId"),
    type: formData.get("type"),
    task: formData.get("task"),
  })
  if (!parsed.success) return { error: parsed.error.errors[0].message }
  const d = parsed.data

  const result = await withTenantContext(ctx.tenantId, async (tx) => {
    if (!(await assertEmployee(tx, ctx.tenantId, d.employeeId))) {
      return { error: "Karyawan tidak ditemukan" as string }
    }
    await tx.insert(onboardingTasks).values({
      tenantId: ctx.tenantId,
      employeeId: d.employeeId,
      type: d.type,
      task: d.task,
    })
    return { ok: true }
  })
  if ("error" in result) return { error: result.error }

  await logAudit({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: "checklist.add",
    entityType: "onboarding_task",
    newValues: { employeeId: d.employeeId, type: d.type, task: d.task },
  })

  revalidatePath("/dashboard/onboarding/manage")
  return { success: "Tugas ditambahkan" }
}

export async function applyDefaultChecklist(
  employeeId: string,
  type: string,
): Promise<State> {
  const ctx = await requireHrWithModule()
  if ("error" in ctx) return { error: ctx.error }
  if (!isChecklistType(type)) return { error: "Tipe checklist tidak valid" }
  const checklistType: ChecklistType = type

  const result = await withTenantContext(ctx.tenantId, async (tx) => {
    if (!(await assertEmployee(tx, ctx.tenantId, employeeId))) {
      return { error: "Karyawan tidak ditemukan" as string }
    }
    const existing = await tx
      .select({ task: onboardingTasks.task })
      .from(onboardingTasks)
      .where(
        and(
          eq(onboardingTasks.employeeId, employeeId),
          eq(onboardingTasks.type, checklistType),
        ),
      )
    const existingTasks = new Set(existing.map((e) => e.task))
    const toInsert = DEFAULT_CHECKLIST[checklistType]
      .filter((task) => !existingTasks.has(task))
      .map((task) => ({ tenantId: ctx.tenantId, employeeId, type: checklistType, task }))

    if (toInsert.length === 0) return { added: 0 }
    await tx.insert(onboardingTasks).values(toInsert)
    return { added: toInsert.length }
  })
  if ("error" in result) return { error: result.error }

  await logAudit({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: "checklist.apply_default",
    entityType: "onboarding_task",
    newValues: { employeeId, type: checklistType, added: result.added },
  })

  revalidatePath("/dashboard/onboarding/manage")
  return {
    success:
      result.added === 0
        ? "Checklist standar sudah ada"
        : `${result.added} tugas ditambahkan`,
  }
}

export async function toggleChecklistTask(id: string): Promise<State> {
  const ctx = await requireHrWithModule()
  if ("error" in ctx) return { error: ctx.error }

  const result = await withTenantContext(ctx.tenantId, async (tx) => {
    const task = await tx.query.onboardingTasks.findFirst({
      where: and(eq(onboardingTasks.id, id), eq(onboardingTasks.tenantId, ctx.tenantId)),
    })
    if (!task) return { error: "Tugas tidak ditemukan" as string }
    const next = !task.isDone
    await tx
      .update(onboardingTasks)
      .set({ isDone: next, doneAt: next ? new Date() : null })
      .where(eq(onboardingTasks.id, id))
    return { done: next }
  })
  if ("error" in result) return { error: result.error }

  revalidatePath("/dashboard/onboarding/manage")
  return { success: result.done ? "Ditandai selesai" : "Ditandai belum selesai" }
}

export async function deleteChecklistTask(id: string): Promise<State> {
  const ctx = await requireHrWithModule()
  if ("error" in ctx) return { error: ctx.error }

  await withTenantContext(ctx.tenantId, async (tx) => {
    await tx
      .delete(onboardingTasks)
      .where(and(eq(onboardingTasks.id, id), eq(onboardingTasks.tenantId, ctx.tenantId)))
  })

  await logAudit({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: "checklist.delete",
    entityType: "onboarding_task",
    entityId: id,
  })

  revalidatePath("/dashboard/onboarding/manage")
  return { success: "Tugas dihapus" }
}
