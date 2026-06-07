import { withTenantContext } from "@/lib/db"
import { shifts } from "@/lib/db/schema"
import { eq, and, asc } from "drizzle-orm"

export type ShiftRow = typeof shifts.$inferSelect

export async function listShifts(tenantId: string): Promise<ShiftRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    return tx
      .select()
      .from(shifts)
      .where(eq(shifts.tenantId, tenantId))
      .orderBy(asc(shifts.startTime))
  })
}

export async function listActiveShifts(
  tenantId: string,
): Promise<{ id: string; name: string; startTime: string; endTime: string }[]> {
  return withTenantContext(tenantId, async (tx) => {
    return tx
      .select({
        id: shifts.id,
        name: shifts.name,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
      })
      .from(shifts)
      .where(and(eq(shifts.tenantId, tenantId), eq(shifts.isActive, true)))
      .orderBy(asc(shifts.startTime))
  })
}
