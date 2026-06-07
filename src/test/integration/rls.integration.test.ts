import { describe, it, expect, afterAll } from "vitest"
import { db, withTenantContext, withSuperAdminContext } from "@/lib/db"
import { employees, users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { createTestTenant, createTestEmployee, cleanupTenants } from "./helpers"

const created: string[] = []
const extraUsers: string[] = []
afterAll(async () => {
  await cleanupTenants(created)
  if (extraUsers.length) {
    await withSuperAdminContext((tx) =>
      tx.delete(users).where(eq(users.id, extraUsers[0])),
    )
  }
})

describe("RLS tenant isolation (DB nyata, app role)", () => {
  it("tenant context hanya melihat data tenant sendiri; tanpa context terblokir", async () => {
    const t1 = await createTestTenant("rls1")
    const t2 = await createTestTenant("rls2")
    created.push(t1.id, t2.id)

    const e1 = await createTestEmployee(t1.id, { name: "Karyawan T1" })
    const e2 = await createTestEmployee(t2.id, { name: "Karyawan T2" })

    const idsT1 = (
      await withTenantContext(t1.id, (tx) =>
        tx.select({ id: employees.id }).from(employees),
      )
    ).map((r) => r.id)
    expect(idsT1).toContain(e1.employee.id)
    expect(idsT1).not.toContain(e2.employee.id)

    const idsT2 = (
      await withTenantContext(t2.id, (tx) =>
        tx.select({ id: employees.id }).from(employees),
      )
    ).map((r) => r.id)
    expect(idsT2).toContain(e2.employee.id)
    expect(idsT2).not.toContain(e1.employee.id)

    // Tanpa context (app role + FORCE RLS) → tidak ada baris terlihat
    const seenNoCtx = await db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.id, e1.employee.id))
    expect(seenNoCtx).toHaveLength(0)

    // Bypass (Super Admin) → lihat lintas tenant
    const seenBypass = await withSuperAdminContext((tx) =>
      tx.select({ id: employees.id }).from(employees).where(eq(employees.id, e2.employee.id)),
    )
    expect(seenBypass).toHaveLength(1)
  })

  it("tenant context tidak bisa menulis baris untuk tenant lain (WITH CHECK)", async () => {
    const t1 = await createTestTenant("rlsw1")
    const t2 = await createTestTenant("rlsw2")
    created.push(t1.id, t2.id)

    // User valid (FK terpenuhi) agar penolakan murni dari RLS WITH CHECK
    const [u] = await withSuperAdminContext((tx) =>
      tx
        .insert(users)
        .values({ email: `rls-${crypto.randomUUID().slice(0, 8)}@test.local` })
        .returning(),
    )
    extraUsers.push(u.id)

    // Dalam konteks t1, insert employee dengan tenant_id = t2 → harus ditolak
    await expect(
      withTenantContext(t1.id, (tx) =>
        tx.insert(employees).values({ userId: u.id, tenantId: t2.id }),
      ),
    ).rejects.toThrow()
  })
})
