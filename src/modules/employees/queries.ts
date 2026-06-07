import { withTenantContext } from "@/lib/db"
import { employees, users } from "@/lib/db/schema"
import { eq, asc } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"

export interface EmployeeListItem {
  id: string
  name: string | null
  email: string
  position: string | null
  department: string | null
  isActive: boolean
  isActivated: boolean // sudah set password (bisa login)
}

export async function listEmployees(tenantId: string): Promise<EmployeeListItem[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: employees.id,
        name: users.name,
        email: users.email,
        position: employees.position,
        department: employees.department,
        isActive: employees.isActive,
        password: users.password,
      })
      .from(employees)
      .innerJoin(users, eq(users.id, employees.userId))
      .orderBy(asc(users.name))

    return rows.map(({ password, ...r }) => ({
      ...r,
      isActivated: Boolean(password),
    }))
  })
}

export interface EmployeeDetail {
  id: string
  userId: string
  name: string | null
  email: string
  position: string | null
  department: string | null
  contractType: string | null
  joinDate: Date | null
  reportsToId: string | null
  reportsToName: string | null
  defaultShiftId: string | null
  nik: string | null
  npwp: string | null
  phone: string | null
  address: string | null
  bankName: string | null
  bankAccountNumber: string | null
  bankAccountName: string | null
  bpjsKesehatan: string | null
  bpjsKetenagakerjaan: string | null
  isActive: boolean
  isActivated: boolean
}

export async function getEmployee(
  tenantId: string,
  id: string,
): Promise<EmployeeDetail | null> {
  return withTenantContext(tenantId, async (tx) => {
    const lead = alias(employees, "lead")
    const leadUser = alias(users, "lead_user")

    const [row] = await tx
      .select({
        id: employees.id,
        userId: employees.userId,
        name: users.name,
        email: users.email,
        position: employees.position,
        department: employees.department,
        contractType: employees.contractType,
        joinDate: employees.joinDate,
        reportsToId: employees.reportsToId,
        reportsToName: leadUser.name,
        defaultShiftId: employees.defaultShiftId,
        nik: employees.nik,
        npwp: employees.npwp,
        phone: employees.phone,
        address: employees.address,
        bankName: employees.bankName,
        bankAccountNumber: employees.bankAccountNumber,
        bankAccountName: employees.bankAccountName,
        bpjsKesehatan: employees.bpjsKesehatan,
        bpjsKetenagakerjaan: employees.bpjsKetenagakerjaan,
        isActive: employees.isActive,
        password: users.password,
      })
      .from(employees)
      .innerJoin(users, eq(users.id, employees.userId))
      .leftJoin(lead, eq(lead.id, employees.reportsToId))
      .leftJoin(leadUser, eq(leadUser.id, lead.userId))
      .where(eq(employees.id, id))
      .limit(1)

    if (!row) return null
    const { password, ...rest } = row
    return { ...rest, isActivated: Boolean(password) }
  })
}

// Daftar kandidat direct lead (untuk dropdown), kecuali dirinya sendiri
export async function listLeadCandidates(
  tenantId: string,
  excludeId?: string,
): Promise<{ id: string; name: string | null; position: string | null }[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: employees.id,
        name: users.name,
        position: employees.position,
      })
      .from(employees)
      .innerJoin(users, eq(users.id, employees.userId))
      .where(eq(employees.isActive, true))
      .orderBy(asc(users.name))

    return excludeId ? rows.filter((r) => r.id !== excludeId) : rows
  })
}
