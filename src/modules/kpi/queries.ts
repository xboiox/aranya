import { withTenantContext } from "@/lib/db"
import {
  kpiPeriods,
  companyObjectives,
  kpiScorecards,
  kpiEpics,
  kpiTasks,
  kpiSubtasks,
  kpiProgress,
  kpiFeedback,
  kpiAppraisals,
  employees,
  users,
  type RubricLevel,
} from "@/lib/db/schema"
import { eq, and, desc, asc, inArray, isNotNull } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import {
  scorecardWeightProblems,
  type EmployeeScorecardState,
} from "./validation"

export type KpiPeriodRow = typeof kpiPeriods.$inferSelect
export type CompanyObjectiveRow = typeof companyObjectives.$inferSelect
export type ScorecardRow = typeof kpiScorecards.$inferSelect
export type AppraisalRow = typeof kpiAppraisals.$inferSelect

// ---------- Periode & objectives (HR) ----------

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

export async function listObjectives(tenantId: string, periodId: string): Promise<CompanyObjectiveRow[]> {
  return withTenantContext(tenantId, (tx) =>
    tx.select().from(companyObjectives).where(eq(companyObjectives.periodId, periodId)).orderBy(asc(companyObjectives.createdAt)),
  )
}

// ---------- Scorecard ----------

export interface ScorecardSummary {
  id: string
  employeeId: string
  employeeName: string | null
  managerId: string
  status: string
  revisionNote: string | null
  periodId: string
  periodStatus: string
}

export async function getScorecard(tenantId: string, scorecardId: string): Promise<ScorecardSummary | null> {
  return withTenantContext(tenantId, async (tx) => {
    const [row] = await tx
      .select({
        id: kpiScorecards.id,
        employeeId: kpiScorecards.employeeId,
        employeeName: users.name,
        managerId: kpiScorecards.managerId,
        status: kpiScorecards.status,
        revisionNote: kpiScorecards.revisionNote,
        periodId: kpiScorecards.periodId,
        periodStatus: kpiPeriods.status,
      })
      .from(kpiScorecards)
      .innerJoin(employees, eq(employees.id, kpiScorecards.employeeId))
      .innerJoin(users, eq(users.id, employees.userId))
      .innerJoin(kpiPeriods, eq(kpiPeriods.id, kpiScorecards.periodId))
      .where(eq(kpiScorecards.id, scorecardId))
      .limit(1)
    return row ?? null
  })
}

export async function getScorecardByEmployee(
  tenantId: string,
  periodId: string,
  employeeId: string,
): Promise<ScorecardSummary | null> {
  return withTenantContext(tenantId, async (tx) => {
    const sc = await tx.query.kpiScorecards.findFirst({
      where: and(eq(kpiScorecards.periodId, periodId), eq(kpiScorecards.employeeId, employeeId)),
    })
    return sc ? getScorecard(tenantId, sc.id) : null
  })
}

// Scorecard milik karyawan lintas periode (untuk halaman /dashboard/kpi).
export interface MyScorecardItem {
  scorecardId: string
  periodId: string
  periodName: string
  periodStatus: string
  status: string
  revisionNote: string | null
}

export async function listMyScorecards(tenantId: string, employeeId: string): Promise<MyScorecardItem[]> {
  return withTenantContext(tenantId, (tx) =>
    tx
      .select({
        scorecardId: kpiScorecards.id,
        periodId: kpiScorecards.periodId,
        periodName: kpiPeriods.name,
        periodStatus: kpiPeriods.status,
        status: kpiScorecards.status,
        revisionNote: kpiScorecards.revisionNote,
      })
      .from(kpiScorecards)
      .innerJoin(kpiPeriods, eq(kpiPeriods.id, kpiScorecards.periodId))
      .where(eq(kpiScorecards.employeeId, employeeId))
      .orderBy(desc(kpiPeriods.startDate)),
  )
}

// Scorecard tim dalam satu periode. HR → semua; manajer → bawahan langsung.
export interface TeamScorecardItem {
  scorecardId: string | null
  employeeId: string
  employeeName: string | null
  status: string | null
}

export async function listTeamScorecards(
  tenantId: string,
  periodId: string,
  managerEmployeeId: string,
  isHr: boolean,
): Promise<TeamScorecardItem[]> {
  return withTenantContext(tenantId, (tx) => {
    const sc = alias(kpiScorecards, "sc")
    const base = tx
      .select({
        scorecardId: sc.id,
        employeeId: employees.id,
        employeeName: users.name,
        status: sc.status,
      })
      .from(employees)
      .innerJoin(users, eq(users.id, employees.userId))
      .leftJoin(sc, and(eq(sc.employeeId, employees.id), eq(sc.periodId, periodId)))
      .where(
        isHr
          ? eq(employees.isActive, true)
          : and(eq(employees.isActive, true), eq(employees.reportsToId, managerEmployeeId)),
      )
      .orderBy(asc(users.name))
    return base
  })
}

// ---------- Pohon scorecard (epic → task + appraisal) ----------

export interface TaskNode {
  id: string
  title: string
  weight: number
  targetNote: string | null
  rubric: RubricLevel[]
  appraisal: AppraisalRow | null
}
export interface EpicNode {
  id: string
  name: string
  weight: number
  tasks: TaskNode[]
}

export async function getScorecardTree(tenantId: string, scorecardId: string): Promise<EpicNode[]> {
  return withTenantContext(tenantId, async (tx) => {
    const epics = await tx
      .select()
      .from(kpiEpics)
      .where(eq(kpiEpics.scorecardId, scorecardId))
      .orderBy(asc(kpiEpics.createdAt))
    if (epics.length === 0) return []

    const epicIds = epics.map((e) => e.id)
    const tasks = await tx
      .select()
      .from(kpiTasks)
      .where(inArray(kpiTasks.epicId, epicIds))
      .orderBy(asc(kpiTasks.createdAt))

    const taskIds = tasks.map((t) => t.id)
    const appraisals = taskIds.length
      ? await tx.select().from(kpiAppraisals).where(inArray(kpiAppraisals.taskId, taskIds))
      : []
    const apprByTask = new Map(appraisals.map((a) => [a.taskId, a]))

    return epics.map((e) => ({
      id: e.id,
      name: e.name,
      weight: e.weight,
      tasks: tasks
        .filter((t) => t.epicId === e.id)
        .map((t) => ({
          id: t.id,
          title: t.title,
          weight: t.weight,
          targetNote: t.targetNote,
          rubric: t.rubric,
          appraisal: apprByTask.get(t.id) ?? null,
        })),
    }))
  })
}

// Semua taskId dalam sebuah scorecard (untuk batch query Fase B).
export async function taskIdsOfScorecard(tenantId: string, scorecardId: string): Promise<string[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ id: kpiTasks.id })
      .from(kpiTasks)
      .innerJoin(kpiEpics, eq(kpiEpics.id, kpiTasks.epicId))
      .where(eq(kpiEpics.scorecardId, scorecardId))
    return rows.map((r) => r.id)
  })
}

// ---------- Eksekusi (Fase B) ----------

export type SubtaskRow = typeof kpiSubtasks.$inferSelect

export async function subtasksForTasks(tenantId: string, taskIds: string[]): Promise<SubtaskRow[]> {
  if (taskIds.length === 0) return []
  return withTenantContext(tenantId, (tx) =>
    tx.select().from(kpiSubtasks).where(inArray(kpiSubtasks.taskId, taskIds)).orderBy(asc(kpiSubtasks.createdAt)),
  )
}

export interface ProgressRow {
  id: string
  taskId: string
  percent: number
  note: string | null
  evidenceName: string | null
  hasEvidence: boolean
  createdAt: Date
}

export async function progressForTasks(tenantId: string, taskIds: string[]): Promise<ProgressRow[]> {
  if (taskIds.length === 0) return []
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: kpiProgress.id,
        taskId: kpiProgress.taskId,
        percent: kpiProgress.percent,
        note: kpiProgress.note,
        evidenceName: kpiProgress.evidenceName,
        evidencePath: kpiProgress.evidencePath,
        createdAt: kpiProgress.createdAt,
      })
      .from(kpiProgress)
      .where(inArray(kpiProgress.taskId, taskIds))
      .orderBy(desc(kpiProgress.createdAt))
    return rows.map(({ evidencePath, ...r }) => ({ ...r, hasEvidence: !!evidencePath }))
  })
}

export interface FeedbackRow {
  id: string
  taskId: string
  fromName: string | null
  message: string
  createdAt: Date
}

export async function feedbackForTasks(tenantId: string, taskIds: string[]): Promise<FeedbackRow[]> {
  if (taskIds.length === 0) return []
  return withTenantContext(tenantId, (tx) =>
    tx
      .select({
        id: kpiFeedback.id,
        taskId: kpiFeedback.taskId,
        fromName: users.name,
        message: kpiFeedback.message,
        createdAt: kpiFeedback.createdAt,
      })
      .from(kpiFeedback)
      .leftJoin(users, eq(users.id, kpiFeedback.fromUserId))
      .where(inArray(kpiFeedback.taskId, taskIds))
      .orderBy(desc(kpiFeedback.createdAt)),
  )
}

export interface EvidenceMeta {
  evidencePath: string | null
  evidenceName: string | null
  employeeUserId: string
  managerId: string
}

export async function getEvidenceMeta(tenantId: string, progressId: string): Promise<EvidenceMeta | null> {
  return withTenantContext(tenantId, async (tx) => {
    const [row] = await tx
      .select({
        evidencePath: kpiProgress.evidencePath,
        evidenceName: kpiProgress.evidenceName,
        employeeUserId: employees.userId,
        managerId: kpiScorecards.managerId,
      })
      .from(kpiProgress)
      .innerJoin(kpiTasks, eq(kpiTasks.id, kpiProgress.taskId))
      .innerJoin(kpiEpics, eq(kpiEpics.id, kpiTasks.epicId))
      .innerJoin(kpiScorecards, eq(kpiScorecards.id, kpiEpics.scorecardId))
      .innerJoin(employees, eq(employees.id, kpiScorecards.employeeId))
      .where(eq(kpiProgress.id, progressId))
      .limit(1)
    return row ?? null
  })
}

// ---------- Guard HR (aktivasi & lock) ----------

// State kesiapan aktivasi per karyawan wajib (aktif + ber-atasan).
export async function listActivationStates(tenantId: string, periodId: string): Promise<EmployeeScorecardState[]> {
  return withTenantContext(tenantId, async (tx) => {
    const required = await tx
      .select({ employeeId: employees.id, employeeName: users.name })
      .from(employees)
      .innerJoin(users, eq(users.id, employees.userId))
      .where(and(eq(employees.isActive, true), isNotNull(employees.reportsToId)))
      .orderBy(asc(users.name))

    const states: EmployeeScorecardState[] = []
    for (const r of required) {
      const sc = await tx.query.kpiScorecards.findFirst({
        where: and(eq(kpiScorecards.periodId, periodId), eq(kpiScorecards.employeeId, r.employeeId)),
      })
      if (!sc) {
        states.push({ employeeName: r.employeeName, hasScorecard: false, agreed: false, weightProblems: [] })
        continue
      }
      const epics = await tx.select().from(kpiEpics).where(eq(kpiEpics.scorecardId, sc.id))
      const tasks = epics.length
        ? await tx.select({ epicId: kpiTasks.epicId, weight: kpiTasks.weight }).from(kpiTasks).where(inArray(kpiTasks.epicId, epics.map((e) => e.id)))
        : []
      const weightProblems = scorecardWeightProblems(
        epics.map((e) => ({ name: e.name, weight: e.weight, taskWeights: tasks.filter((t) => t.epicId === e.id).map((t) => t.weight) })),
      )
      states.push({
        employeeName: r.employeeName,
        hasScorecard: true,
        agreed: sc.status === "agreed",
        weightProblems,
      })
    }
    return states
  })
}

// Baris managerScore semua task sebuah periode — untuk guard lock.
export async function listLockScoreRows(tenantId: string, periodId: string) {
  return withTenantContext(tenantId, (tx) =>
    tx
      .select({ employeeName: users.name, managerScore: kpiAppraisals.managerScore })
      .from(kpiTasks)
      .innerJoin(kpiEpics, eq(kpiEpics.id, kpiTasks.epicId))
      .innerJoin(kpiScorecards, eq(kpiScorecards.id, kpiEpics.scorecardId))
      .innerJoin(employees, eq(employees.id, kpiScorecards.employeeId))
      .innerJoin(users, eq(users.id, employees.userId))
      .leftJoin(kpiAppraisals, eq(kpiAppraisals.taskId, kpiTasks.id))
      .where(eq(kpiScorecards.periodId, periodId)),
  )
}
