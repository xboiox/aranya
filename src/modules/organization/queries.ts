import { withTenantContext } from "@/lib/db"
import { employees, users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import type { OrgEmployee } from "./tree"

export async function listOrgEmployees(tenantId: string): Promise<OrgEmployee[]> {
  return withTenantContext(tenantId, async (tx) => {
    return tx
      .select({
        id: employees.id,
        name: users.name,
        position: employees.position,
        department: employees.department,
        reportsToId: employees.reportsToId,
      })
      .from(employees)
      .innerJoin(users, eq(users.id, employees.userId))
      .where(eq(employees.isActive, true))
  })
}
