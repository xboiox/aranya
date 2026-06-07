import { withSuperAdminContext } from "@/lib/db"
import { tenants, employees, users } from "@/lib/db/schema"
import { eq, inArray } from "drizzle-orm"

// Membuat tenant + karyawan ephemeral untuk test (via bypass context).
export async function createTestTenant(label: string) {
  const suffix = crypto.randomUUID().slice(0, 8)
  return withSuperAdminContext(async (tx) => {
    const [tenant] = await tx
      .insert(tenants)
      .values({ name: `Test ${label} ${suffix}`, slug: `test-${label}-${suffix}` })
      .returning()
    return tenant
  })
}

export async function createTestEmployee(
  tenantId: string,
  opts: { name?: string; reportsToId?: string | null } = {},
) {
  return withSuperAdminContext(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        email: `emp-${crypto.randomUUID().slice(0, 8)}@test.local`,
        name: opts.name ?? "Test Employee",
      })
      .returning()
    const [emp] = await tx
      .insert(employees)
      .values({ userId: user.id, tenantId, reportsToId: opts.reportsToId ?? null })
      .returning()
    return { employee: emp, user }
  })
}

// Hapus tenant test + user yatim (dipanggil di afterAll/afterEach).
export async function cleanupTenants(tenantIds: string[]) {
  if (tenantIds.length === 0) return
  await withSuperAdminContext(async (tx) => {
    const emps = await tx
      .select({ userId: employees.userId })
      .from(employees)
      .where(inArray(employees.tenantId, tenantIds))
    const userIds = emps.map((e) => e.userId)
    for (const id of tenantIds) {
      await tx.delete(tenants).where(eq(tenants.id, id))
    }
    if (userIds.length > 0) {
      await tx.delete(users).where(inArray(users.id, userIds))
    }
  })
}
