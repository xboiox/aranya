import { describe, it, expect, afterAll } from "vitest"
import { withSuperAdminContext } from "@/lib/db"
import { leaveRequests } from "@/lib/db/schema"
import { getLeaveBalance } from "@/modules/leave/queries"
import { createTestTenant, createTestEmployee, cleanupTenants } from "./helpers"

const created: string[] = []
afterAll(() => cleanupTenants(created))

const year = new Date().getUTCFullYear()
const d = (mmdd: string) => new Date(`${year}-${mmdd}T00:00:00.000Z`)

async function insertLeave(
  tenantId: string,
  employeeId: string,
  type: string,
  status: string,
  totalDays: number,
) {
  await withSuperAdminContext((tx) =>
    tx.insert(leaveRequests).values({
      tenantId,
      employeeId,
      type,
      status,
      startDate: d("03-02"),
      endDate: d("03-06"),
      totalDays,
    }),
  )
}

describe("Leave balance (DB nyata)", () => {
  it("menghitung saldo: hanya cuti tahunan yang APPROVED yang mengurangi kuota", async () => {
    const t = await createTestTenant("leave")
    created.push(t.id)
    const { employee } = await createTestEmployee(t.id)

    // Awal: kuota default 12, terpakai 0
    let bal = await getLeaveBalance(t.id, employee.id, year)
    expect(bal.quota).toBe(12)
    expect(bal.used).toBe(0)
    expect(bal.remaining).toBe(12)

    // Cuti tahunan approved 5 hari → terpakai 5
    await insertLeave(t.id, employee.id, "annual", "approved", 5)
    bal = await getLeaveBalance(t.id, employee.id, year)
    expect(bal.used).toBe(5)
    expect(bal.remaining).toBe(7)

    // Pending tidak dihitung
    await insertLeave(t.id, employee.id, "annual", "pending", 3)
    bal = await getLeaveBalance(t.id, employee.id, year)
    expect(bal.used).toBe(5)

    // Jenis non-annual (sakit) approved tidak mengurangi kuota tahunan
    await insertLeave(t.id, employee.id, "sick", "approved", 2)
    bal = await getLeaveBalance(t.id, employee.id, year)
    expect(bal.used).toBe(5)
    expect(bal.remaining).toBe(7)
  })

  it("saldo terisolasi per tenant", async () => {
    const tA = await createTestTenant("leaveA")
    const tB = await createTestTenant("leaveB")
    created.push(tA.id, tB.id)
    const empA = (await createTestEmployee(tA.id)).employee
    const empB = (await createTestEmployee(tB.id)).employee

    await insertLeave(tA.id, empA.id, "annual", "approved", 4)

    const balA = await getLeaveBalance(tA.id, empA.id, year)
    const balB = await getLeaveBalance(tB.id, empB.id, year)
    expect(balA.used).toBe(4)
    expect(balB.used).toBe(0) // tenant lain tidak terpengaruh
  })
})
