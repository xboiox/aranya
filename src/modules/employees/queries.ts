import { withTenantContext, type Database } from "@/lib/db"
import { employees, users } from "@/lib/db/schema"
import { eq, asc, count, or, ilike, type SQL } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"

export interface EmployeeListItem {
  id: string
  name: string | null
  email: string
  position: string | null
  department: string | null
  managerName: string | null
  isActive: boolean
  isActivated: boolean // sudah set password (bisa login)
}

// Query dasar daftar karyawan (+ nama atasan langsung via self-join).
function selectEmployees(tx: Database, where?: SQL) {
  const manager = alias(employees, "manager")
  const managerUser = alias(users, "manager_user")
  const q = tx
    .select({
      id: employees.id,
      name: users.name,
      email: users.email,
      position: employees.position,
      department: employees.department,
      managerName: managerUser.name,
      isActive: employees.isActive,
      password: users.password,
    })
    .from(employees)
    .innerJoin(users, eq(users.id, employees.userId))
    .leftJoin(manager, eq(manager.id, employees.reportsToId))
    .leftJoin(managerUser, eq(managerUser.id, manager.userId))
  return (where ? q.where(where) : q).orderBy(asc(users.name))
}

// Filter pencarian berdasarkan nama atau email (case-insensitive).
function searchWhere(q?: string): SQL | undefined {
  const needle = q?.trim()
  if (!needle) return undefined
  const pattern = `%${needle}%`
  return or(ilike(users.name, pattern), ilike(users.email, pattern))
}

function mapEmployeeRow({
  password,
  ...r
}: { password: string | null } & Omit<EmployeeListItem, "isActivated">): EmployeeListItem {
  return { ...r, isActivated: Boolean(password) }
}

export async function listEmployees(tenantId: string): Promise<EmployeeListItem[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await selectEmployees(tx)
    return rows.map(mapEmployeeRow)
  })
}

export interface PaginatedEmployees {
  items: EmployeeListItem[]
  total: number
}

export async function listEmployeesPaginated(
  tenantId: string,
  page: number,
  pageSize: number,
  q?: string,
): Promise<PaginatedEmployees> {
  return withTenantContext(tenantId, async (tx) => {
    const where = searchWhere(q)
    const rows = await selectEmployees(tx, where)
      .limit(pageSize)
      .offset(page * pageSize)

    const countQuery = tx
      .select({ value: count() })
      .from(employees)
      .innerJoin(users, eq(users.id, employees.userId))
    const [totalRow] = await (where ? countQuery.where(where) : countQuery)

    return {
      items: rows.map(mapEmployeeRow),
      total: Number(totalRow?.value ?? 0),
    }
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
