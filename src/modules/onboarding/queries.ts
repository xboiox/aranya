import { withTenantContext } from "@/lib/db"
import { onboardingTasks } from "@/lib/db/schema"
import { eq, and, asc } from "drizzle-orm"
import type { ChecklistType } from "./schema"

export type ChecklistTask = typeof onboardingTasks.$inferSelect

export async function listChecklist(
  tenantId: string,
  employeeId: string,
  type: ChecklistType,
): Promise<ChecklistTask[]> {
  return withTenantContext(tenantId, async (tx) => {
    return tx
      .select()
      .from(onboardingTasks)
      .where(
        and(
          eq(onboardingTasks.employeeId, employeeId),
          eq(onboardingTasks.type, type),
        ),
      )
      .orderBy(asc(onboardingTasks.createdAt))
  })
}

// Semua checklist milik satu karyawan (untuk self-view), kedua tipe.
export async function listMyChecklist(
  tenantId: string,
  employeeId: string,
): Promise<ChecklistTask[]> {
  return withTenantContext(tenantId, async (tx) => {
    return tx
      .select()
      .from(onboardingTasks)
      .where(eq(onboardingTasks.employeeId, employeeId))
      .orderBy(asc(onboardingTasks.createdAt))
  })
}
