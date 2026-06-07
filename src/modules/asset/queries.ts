import { withTenantContext } from "@/lib/db"
import { assets, employees, users } from "@/lib/db/schema"
import { eq, asc } from "drizzle-orm"

export type AssetRow = typeof assets.$inferSelect

export async function listMyAssets(
  tenantId: string,
  employeeId: string,
): Promise<AssetRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    return tx
      .select()
      .from(assets)
      .where(eq(assets.assignedToId, employeeId))
      .orderBy(asc(assets.name))
  })
}

export interface AssetAdminRow {
  id: string
  name: string
  category: string
  serialNumber: string | null
  assignedToId: string | null
  assignedToName: string | null
}

export async function listAllAssets(tenantId: string): Promise<AssetAdminRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    return tx
      .select({
        id: assets.id,
        name: assets.name,
        category: assets.category,
        serialNumber: assets.serialNumber,
        assignedToId: assets.assignedToId,
        assignedToName: users.name,
      })
      .from(assets)
      .leftJoin(employees, eq(employees.id, assets.assignedToId))
      .leftJoin(users, eq(users.id, employees.userId))
      .orderBy(asc(assets.name))
  })
}
