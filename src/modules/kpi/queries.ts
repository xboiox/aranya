import { withTenantContext } from "@/lib/db"
import {
  kpiPeriods,
  companyObjectives,
  kpis,
  kpiProgress,
  kpiFeedback,
  kpiAppraisals,
  employees,
  users,
} from "@/lib/db/schema"
import { eq, and, desc, asc, inArray } from "drizzle-orm"
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

// ---------- Fase B: progres & feedback ----------

export interface ProgressRow {
  id: string
  kpiId: string
  percent: number
  note: string | null
  evidenceName: string | null
  hasEvidence: boolean
  createdAt: Date
}

// Semua progres untuk sekumpulan KPI (urut terbaru dulu). Page mengelompokkan per kpiId.
export async function progressForKpis(
  tenantId: string,
  kpiIds: string[],
): Promise<ProgressRow[]> {
  if (kpiIds.length === 0) return []
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: kpiProgress.id,
        kpiId: kpiProgress.kpiId,
        percent: kpiProgress.percent,
        note: kpiProgress.note,
        evidenceName: kpiProgress.evidenceName,
        evidencePath: kpiProgress.evidencePath,
        createdAt: kpiProgress.createdAt,
      })
      .from(kpiProgress)
      .where(inArray(kpiProgress.kpiId, kpiIds))
      .orderBy(desc(kpiProgress.createdAt))
    return rows.map(({ evidencePath, ...r }) => ({ ...r, hasEvidence: !!evidencePath }))
  })
}

export interface FeedbackRow {
  id: string
  kpiId: string
  fromName: string | null
  message: string
  createdAt: Date
}

export async function feedbackForKpis(
  tenantId: string,
  kpiIds: string[],
): Promise<FeedbackRow[]> {
  if (kpiIds.length === 0) return []
  return withTenantContext(tenantId, (tx) =>
    tx
      .select({
        id: kpiFeedback.id,
        kpiId: kpiFeedback.kpiId,
        fromName: users.name,
        message: kpiFeedback.message,
        createdAt: kpiFeedback.createdAt,
      })
      .from(kpiFeedback)
      .leftJoin(users, eq(users.id, kpiFeedback.fromUserId))
      .where(inArray(kpiFeedback.kpiId, kpiIds))
      .orderBy(desc(kpiFeedback.createdAt)),
  )
}

// Data untuk otorisasi unduh bukti: pemilik KPI + manajer + path.
export interface EvidenceMeta {
  evidencePath: string | null
  evidenceName: string | null
  employeeUserId: string
  managerId: string
}

export async function getEvidenceMeta(
  tenantId: string,
  progressId: string,
): Promise<EvidenceMeta | null> {
  return withTenantContext(tenantId, async (tx) => {
    const [row] = await tx
      .select({
        evidencePath: kpiProgress.evidencePath,
        evidenceName: kpiProgress.evidenceName,
        employeeUserId: employees.userId,
        managerId: kpis.managerId,
      })
      .from(kpiProgress)
      .innerJoin(kpis, eq(kpis.id, kpiProgress.kpiId))
      .innerJoin(employees, eq(employees.id, kpis.employeeId))
      .where(eq(kpiProgress.id, progressId))
      .limit(1)
    return row ?? null
  })
}

// ---------- Fase C: penilaian ----------

export type AppraisalRow = typeof kpiAppraisals.$inferSelect

export async function appraisalsForKpis(
  tenantId: string,
  kpiIds: string[],
): Promise<AppraisalRow[]> {
  if (kpiIds.length === 0) return []
  return withTenantContext(tenantId, (tx) =>
    tx.select().from(kpiAppraisals).where(inArray(kpiAppraisals.kpiId, kpiIds)),
  )
}

export interface ScoreRow {
  kpiId: string
  employeeId: string
  employeeName: string | null
  weight: number
  managerScore: number | null
  finalScore: number | null
}

// Baris skor semua KPI sebuah periode — untuk guard lock & laporan skor akhir.
export async function listScoreRows(tenantId: string, periodId: string): Promise<ScoreRow[]> {
  return withTenantContext(tenantId, (tx) =>
    tx
      .select({
        kpiId: kpis.id,
        employeeId: kpis.employeeId,
        employeeName: users.name,
        weight: kpis.weight,
        managerScore: kpiAppraisals.managerScore,
        finalScore: kpiAppraisals.finalScore,
      })
      .from(kpis)
      .innerJoin(employees, eq(employees.id, kpis.employeeId))
      .innerJoin(users, eq(users.id, employees.userId))
      .leftJoin(kpiAppraisals, eq(kpiAppraisals.kpiId, kpis.id))
      .where(eq(kpis.periodId, periodId))
      .orderBy(asc(users.name)),
  )
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
