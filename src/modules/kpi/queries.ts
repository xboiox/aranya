import { withTenantContext } from "@/lib/db"
import { kpiPeriods, companyObjectives, kpis, employees, users } from "@/lib/db/schema"
import { eq, and, desc, asc } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"

export type KpiPeriodRow = typeof kpiPeriods.$inferSelect
export type CompanyObjectiveRow = typeof companyObjectives.$inferSelect
export type KpiRow = typeof kpis.$inferSelect

export async function listPeriods(tenantId: string): Promise<KpiPeriodRow[]> {
  return withTenantContext(tenantId, (tx) =>
    tx.select().from(kpiPeriods).orderBy(desc(kpiPeriods.startDate)),
  )
}

export async function getPeriod(tenantId: string, periodId: string): Promise<KpiPeriodRow | null> {
  return withTenantContext(tenantId, async (tx) => {
    const p = await tx.query.kpiPeriods.findFirst({ where: eq(kpiPeriods.id, periodId) })
    return p ?? null
  })
}

export async function listObjectives(
  tenantId: string,
  periodId: string,
): Promise<CompanyObjectiveRow[]> {
  return withTenantContext(tenantId, (tx) =>
    tx
      .select()
      .from(companyObjectives)
      .where(eq(companyObjectives.periodId, periodId))
      .orderBy(asc(companyObjectives.createdAt)),
  )
}

export interface MyKpiItem {
  id: string
  periodName: string
  periodStatus: string
  title: string
  description: string | null
  weight: number
  target: string | null
  status: string
  revisionNote: string | null
}

export async function listMyKpis(tenantId: string, employeeId: string): Promise<MyKpiItem[]> {
  return withTenantContext(tenantId, (tx) =>
    tx
      .select({
        id: kpis.id,
        periodName: kpiPeriods.name,
        periodStatus: kpiPeriods.status,
        title: kpis.title,
        description: kpis.description,
        weight: kpis.weight,
        target: kpis.target,
        status: kpis.status,
        revisionNote: kpis.revisionNote,
      })
      .from(kpis)
      .innerJoin(kpiPeriods, eq(kpiPeriods.id, kpis.periodId))
      .where(eq(kpis.employeeId, employeeId))
      .orderBy(desc(kpiPeriods.startDate), asc(kpis.createdAt)),
  )
}

export interface TeamKpiItem {
  id: string
  employeeId: string
  employeeName: string | null
  title: string
  weight: number
  target: string | null
  status: string
  revisionNote: string | null
}

// KPI dalam satu periode. HR → semua; manajer → bawahan langsung saja.
export async function listTeamKpis(
  tenantId: string,
  periodId: string,
  managerEmployeeId: string,
  isHr: boolean,
): Promise<TeamKpiItem[]> {
  return withTenantContext(tenantId, (tx) => {
    const base = tx
      .select({
        id: kpis.id,
        employeeId: kpis.employeeId,
        employeeName: users.name,
        title: kpis.title,
        weight: kpis.weight,
        target: kpis.target,
        status: kpis.status,
        revisionNote: kpis.revisionNote,
      })
      .from(kpis)
      .innerJoin(employees, eq(employees.id, kpis.employeeId))
      .innerJoin(users, eq(users.id, employees.userId))
      .orderBy(asc(users.name), asc(kpis.createdAt))

    if (isHr) return base.where(eq(kpis.periodId, periodId))
    return base.where(
      and(eq(kpis.periodId, periodId), eq(employees.reportsToId, managerEmployeeId)),
    )
  })
}

export interface ReportOption {
  id: string
  name: string | null
}

// Kandidat karyawan untuk diberi KPI. HR → semua aktif; manajer → bawahan langsung.
export async function listAssignableEmployees(
  tenantId: string,
  managerEmployeeId: string,
  isHr: boolean,
): Promise<ReportOption[]> {
  return withTenantContext(tenantId, (tx) => {
    const base = tx
      .select({ id: employees.id, name: users.name })
      .from(employees)
      .innerJoin(users, eq(users.id, employees.userId))
      .orderBy(asc(users.name))
    if (isHr) return base.where(eq(employees.isActive, true))
    return base.where(
      and(eq(employees.isActive, true), eq(employees.reportsToId, managerEmployeeId)),
    )
  })
}

// Baris bobot/status semua KPI sebuah periode — untuk guard aktivasi (HR).
export async function listWeightRows(tenantId: string, periodId: string) {
  return withTenantContext(tenantId, (tx) => {
    const requesterUser = alias(users, "emp_user")
    return tx
      .select({
        employeeId: kpis.employeeId,
        employeeName: requesterUser.name,
        weight: kpis.weight,
        status: kpis.status,
      })
      .from(kpis)
      .innerJoin(employees, eq(employees.id, kpis.employeeId))
      .innerJoin(requesterUser, eq(requesterUser.id, employees.userId))
      .where(eq(kpis.periodId, periodId))
  })
}
