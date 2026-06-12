"use server"
import { randomUUID } from "crypto"
import { auth, hasRole } from "@/lib/auth"
import { withTenantContext, type Database } from "@/lib/db"
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
} from "@/lib/db/schema"
import { logAudit } from "@/lib/audit"
import { notify } from "@/lib/notifications"
import { isModuleActive } from "@/lib/modules"
import { putObject } from "@/lib/storage"
import { GCS_PATHS } from "@/lib/gcs"
import {
  periodCreateSchema,
  objectiveCreateSchema,
  epicSchema,
  taskSchema,
  parseRubric,
  subtaskSchema,
  progressSchema,
  feedbackSchema,
  realizationSchema,
  managerScoreSchema,
  calibrateSchema,
} from "./schema"
import { listActivationStates, listLockScoreRows } from "./queries"
import { activationProblems, lockProblems, scorecardWeightProblems } from "./validation"
import { eq, and, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"

type State = { error?: string; success?: string }

const MAX_EVIDENCE = 5 * 1024 * 1024
const EVIDENCE_EXT = /\.(pdf|png|jpe?g|webp)$/i

async function ctx() {
  const session = await auth()
  if (!session) return { error: "Tidak terautentikasi" as const }
  const tenantId = session.user.tenantId
  if (!tenantId) return { error: "Akun tidak terhubung ke perusahaan" as const }
  if (!(await isModuleActive(tenantId, "MODULE_2"))) {
    return { error: "Modul HR Operations & Performance belum aktif" as const }
  }
  return { session, tenantId }
}

async function requireHr() {
  const c = await ctx()
  if ("error" in c) return c
  if (!hasRole(c.session.user.roles, "hr_admin")) {
    return { error: "Hanya HR Admin yang dapat aksi ini" as const }
  }
  return c
}

async function periodStatusOf(tx: Database, periodId: string): Promise<string | undefined> {
  const p = await tx.query.kpiPeriods.findFirst({ where: eq(kpiPeriods.id, periodId) })
  return p?.status
}

// Apakah aktor (HR atau atasan langsung) boleh mengelola scorecard karyawan ini.
async function canManageEmployee(tx: Database, actorUserId: string, isHr: boolean, employeeId: string): Promise<boolean> {
  if (isHr) return true
  const emp = await tx.query.employees.findFirst({ where: eq(employees.id, employeeId) })
  if (!emp?.reportsToId) return false
  const me = await tx.query.employees.findFirst({ where: eq(employees.userId, actorUserId) })
  return !!me && emp.reportsToId === me.id
}

// ---------- Periode (HR) ----------

export async function createPeriod(_prev: State, formData: FormData): Promise<State> {
  const c = await requireHr()
  if ("error" in c) return { error: c.error }
  const parsed = periodCreateSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  })
  if (!parsed.success) return { error: parsed.error.errors[0].message }
  const d = parsed.data
  await withTenantContext(c.tenantId, (tx) =>
    tx.insert(kpiPeriods).values({ tenantId: c.tenantId, name: d.name, type: d.type, startDate: new Date(d.startDate), endDate: new Date(d.endDate) }),
  )
  await logAudit({ tenantId: c.tenantId, userId: c.session.user.id, action: "kpi.period.create", entityType: "kpi_period", newValues: { name: d.name } })
  revalidatePath("/dashboard/kpi/periods")
  return { success: "Periode dibuat" }
}

export async function deletePeriod(periodId: string): Promise<State> {
  const c = await requireHr()
  if ("error" in c) return { error: c.error }
  const result = await withTenantContext(c.tenantId, async (tx) => {
    const p = await tx.query.kpiPeriods.findFirst({ where: eq(kpiPeriods.id, periodId) })
    if (!p) return { error: "Periode tidak ditemukan" as string }
    if (p.status !== "planning") return { error: "Hanya periode perencanaan yang bisa dihapus" }
    await tx.delete(kpiPeriods).where(eq(kpiPeriods.id, periodId))
    return { ok: true }
  })
  if ("error" in result) return { error: result.error }
  await logAudit({ tenantId: c.tenantId, userId: c.session.user.id, action: "kpi.period.delete", entityType: "kpi_period", entityId: periodId })
  revalidatePath("/dashboard/kpi/periods")
  return { success: "Periode dihapus" }
}

async function transitionPeriod(periodId: string, from: string, to: string, action: string): Promise<State> {
  const c = await requireHr()
  if ("error" in c) return { error: c.error }
  const status = await withTenantContext(c.tenantId, (tx) => periodStatusOf(tx, periodId))
  if (status !== from) return { error: `Transisi tidak sesuai tahap (status: ${status ?? "?"})` }
  await withTenantContext(c.tenantId, (tx) =>
    tx.update(kpiPeriods).set({ status: to, updatedAt: new Date() }).where(eq(kpiPeriods.id, periodId)),
  )
  await logAudit({ tenantId: c.tenantId, userId: c.session.user.id, action, entityType: "kpi_period", entityId: periodId })
  revalidatePath("/dashboard/kpi/periods")
  return {}
}

export async function activatePeriod(periodId: string): Promise<State> {
  const c = await requireHr()
  if ("error" in c) return { error: c.error }
  if ((await withTenantContext(c.tenantId, (tx) => periodStatusOf(tx, periodId))) !== "planning") {
    return { error: "Hanya periode perencanaan yang bisa diaktifkan" }
  }
  const problems = activationProblems(await listActivationStates(c.tenantId, periodId))
  if (problems.length > 0) return { error: `Belum bisa diaktifkan — ${problems.join("; ")}` }
  const r = await transitionPeriod(periodId, "planning", "active", "kpi.period.activate")
  return r.error ? r : { success: "Periode diaktifkan" }
}

export async function startAppraisal(periodId: string): Promise<State> {
  const r = await transitionPeriod(periodId, "active", "appraisal", "kpi.period.appraisal")
  return r.error ? r : { success: "Periode masuk tahap penilaian" }
}

export async function lockPeriod(periodId: string): Promise<State> {
  const c = await requireHr()
  if ("error" in c) return { error: c.error }
  if ((await withTenantContext(c.tenantId, (tx) => periodStatusOf(tx, periodId))) !== "appraisal") {
    return { error: "Hanya periode penilaian yang bisa dikunci" }
  }
  const problems = lockProblems(await listLockScoreRows(c.tenantId, periodId))
  if (problems.length > 0) return { error: `Belum bisa dikunci — ${problems.join("; ")}` }
  const r = await transitionPeriod(periodId, "appraisal", "locked", "kpi.period.lock")
  return r.error ? r : { success: "Periode dikunci" }
}

// ---------- Company objectives (HR) ----------

export async function addObjective(_prev: State, formData: FormData): Promise<State> {
  const c = await requireHr()
  if ("error" in c) return { error: c.error }
  const periodId = String(formData.get("periodId") ?? "")
  const parsed = objectiveCreateSchema.safeParse({ title: formData.get("title"), description: formData.get("description") })
  if (!parsed.success) return { error: parsed.error.errors[0].message }
  const ok = await withTenantContext(c.tenantId, async (tx) => {
    const p = await tx.query.kpiPeriods.findFirst({ where: eq(kpiPeriods.id, periodId) })
    if (!p) return false
    await tx.insert(companyObjectives).values({ tenantId: c.tenantId, periodId, title: parsed.data.title, description: parsed.data.description ?? null })
    return true
  })
  if (!ok) return { error: "Periode tidak ditemukan" }
  revalidatePath(`/dashboard/kpi/periods/${periodId}`)
  return { success: "Target perusahaan ditambahkan" }
}

export async function deleteObjective(id: string, periodId: string): Promise<State> {
  const c = await requireHr()
  if ("error" in c) return { error: c.error }
  await withTenantContext(c.tenantId, (tx) =>
    tx.delete(companyObjectives).where(and(eq(companyObjectives.id, id), eq(companyObjectives.tenantId, c.tenantId))),
  )
  revalidatePath(`/dashboard/kpi/periods/${periodId}`)
  return { success: "Target dihapus" }
}

// ---------- Scorecard (manajer/HR menyusun; karyawan menyetujui) ----------

export async function createScorecard(periodId: string, employeeId: string): Promise<State> {
  const c = await ctx()
  if ("error" in c) return { error: c.error }
  const isHr = hasRole(c.session.user.roles, "hr_admin")
  const result = await withTenantContext(c.tenantId, async (tx) => {
    if ((await periodStatusOf(tx, periodId)) !== "planning") return { error: "Scorecard hanya dibuat saat perencanaan" as string }
    if (!(await canManageEmployee(tx, c.session.user.id, isHr, employeeId))) return { error: "Anda hanya bisa membuat scorecard bawahan langsung" }
    const existing = await tx.query.kpiScorecards.findFirst({ where: and(eq(kpiScorecards.periodId, periodId), eq(kpiScorecards.employeeId, employeeId)) })
    if (existing) return { error: "Scorecard sudah ada" }
    const [sc] = await tx.insert(kpiScorecards).values({ tenantId: c.tenantId, periodId, employeeId, managerId: c.session.user.id }).returning()
    return { sc }
  })
  if ("error" in result) return { error: result.error }
  await logAudit({ tenantId: c.tenantId, userId: c.session.user.id, action: "kpi.scorecard.create", entityType: "kpi_scorecard", entityId: result.sc.id })
  revalidatePath("/dashboard/kpi/team")
  return { success: "Scorecard dibuat" }
}

// Memuat scorecard + cek phase planning + authz manajer/HR.
async function loadEditableScorecard(tx: Database, actorUserId: string, isHr: boolean, scorecardId: string) {
  const sc = await tx.query.kpiScorecards.findFirst({ where: eq(kpiScorecards.id, scorecardId) })
  if (!sc) return { error: "Scorecard tidak ditemukan" as string }
  if ((await periodStatusOf(tx, sc.periodId)) !== "planning") return { error: "Periode tidak dalam perencanaan" }
  if (!(await canManageEmployee(tx, actorUserId, isHr, sc.employeeId))) return { error: "Anda tidak berwenang atas scorecard ini" }
  if (!["draft", "revision_requested"].includes(sc.status)) return { error: "Scorecard sudah dikirim" }
  return { sc }
}

export async function deleteScorecard(scorecardId: string): Promise<State> {
  const c = await ctx()
  if ("error" in c) return { error: c.error }
  const isHr = hasRole(c.session.user.roles, "hr_admin")
  const result = await withTenantContext(c.tenantId, async (tx) => {
    const r = await loadEditableScorecard(tx, c.session.user.id, isHr, scorecardId)
    if ("error" in r) return { error: r.error }
    await tx.delete(kpiScorecards).where(eq(kpiScorecards.id, scorecardId))
    return { ok: true }
  })
  if ("error" in result) return { error: result.error }
  revalidatePath("/dashboard/kpi/team")
  return { success: "Scorecard dihapus" }
}

export async function sendScorecard(scorecardId: string): Promise<State> {
  const c = await ctx()
  if ("error" in c) return { error: c.error }
  const isHr = hasRole(c.session.user.roles, "hr_admin")
  const result = await withTenantContext(c.tenantId, async (tx) => {
    const r = await loadEditableScorecard(tx, c.session.user.id, isHr, scorecardId)
    if ("error" in r) return { error: r.error }
    // Validasi bobot 2 tingkat sebelum dikirim
    const epics = await tx.select().from(kpiEpics).where(eq(kpiEpics.scorecardId, scorecardId))
    const tasks = epics.length ? await tx.select({ epicId: kpiTasks.epicId, weight: kpiTasks.weight }).from(kpiTasks).where(inArray(kpiTasks.epicId, epics.map((e) => e.id))) : []
    const wp = scorecardWeightProblems(epics.map((e) => ({ name: e.name, weight: e.weight, taskWeights: tasks.filter((t) => t.epicId === e.id).map((t) => t.weight) })))
    if (wp.length > 0) return { error: `Bobot belum valid — ${wp.join("; ")}` }
    await tx.update(kpiScorecards).set({ status: "proposed", revisionNote: null, updatedAt: new Date() }).where(eq(kpiScorecards.id, scorecardId))
    const emp = await tx.query.employees.findFirst({ where: eq(employees.id, r.sc.employeeId) })
    return { employeeUserId: emp?.userId ?? null }
  })
  if ("error" in result) return { error: result.error }
  await logAudit({ tenantId: c.tenantId, userId: c.session.user.id, action: "kpi.scorecard.send", entityType: "kpi_scorecard", entityId: scorecardId })
  if (result.employeeUserId) {
    await notify({ tenantId: c.tenantId, userId: result.employeeUserId, type: "kpi_proposed", title: "Scorecard KPI menunggu persetujuan", body: "Atasan mengirim scorecard KPI untuk Anda setujui.", data: { scorecardId } })
  }
  revalidatePath("/dashboard/kpi/team")
  return { success: "Scorecard dikirim ke karyawan" }
}

// Karyawan: setujui / minta revisi scorecard miliknya (period planning, status proposed).
async function loadOwnedProposedScorecard(tx: Database, actorUserId: string, scorecardId: string) {
  const myEmployeeId = await getEmployeeIdByUser2(tx, actorUserId)
  const sc = await tx.query.kpiScorecards.findFirst({ where: eq(kpiScorecards.id, scorecardId) })
  if (!sc) return { error: "Scorecard tidak ditemukan" as string }
  if (sc.employeeId !== myEmployeeId) return { error: "Ini bukan scorecard Anda" }
  if ((await periodStatusOf(tx, sc.periodId)) !== "planning") return { error: "Periode tidak dalam perencanaan" }
  if (sc.status !== "proposed") return { error: "Scorecard ini sudah diproses" }
  return { sc }
}

async function getEmployeeIdByUser2(tx: Database, userId: string): Promise<string | null> {
  const emp = await tx.query.employees.findFirst({ where: eq(employees.userId, userId) })
  return emp?.id ?? null
}

export async function agreeScorecard(scorecardId: string): Promise<State> {
  const c = await ctx()
  if ("error" in c) return { error: c.error }
  const result = await withTenantContext(c.tenantId, async (tx) => {
    const r = await loadOwnedProposedScorecard(tx, c.session.user.id, scorecardId)
    if ("error" in r) return { error: r.error }
    await tx.update(kpiScorecards).set({ status: "agreed", agreedAt: new Date(), revisionNote: null, updatedAt: new Date() }).where(eq(kpiScorecards.id, scorecardId))
    return { managerId: r.sc.managerId }
  })
  if ("error" in result) return { error: result.error }
  await logAudit({ tenantId: c.tenantId, userId: c.session.user.id, action: "kpi.scorecard.agree", entityType: "kpi_scorecard", entityId: scorecardId })
  await notify({ tenantId: c.tenantId, userId: result.managerId, type: "kpi_agreed", title: "Scorecard KPI disetujui", body: `${c.session.user.name ?? "Karyawan"} menyetujui scorecard KPI.`, data: { scorecardId } })
  revalidatePath("/dashboard/kpi")
  return { success: "Scorecard disetujui" }
}

export async function requestRevisionScorecard(scorecardId: string, note: string): Promise<State> {
  const c = await ctx()
  if ("error" in c) return { error: c.error }
  const result = await withTenantContext(c.tenantId, async (tx) => {
    const r = await loadOwnedProposedScorecard(tx, c.session.user.id, scorecardId)
    if ("error" in r) return { error: r.error }
    await tx.update(kpiScorecards).set({ status: "revision_requested", revisionNote: note?.trim() || null, updatedAt: new Date() }).where(eq(kpiScorecards.id, scorecardId))
    return { managerId: r.sc.managerId }
  })
  if ("error" in result) return { error: result.error }
  await logAudit({ tenantId: c.tenantId, userId: c.session.user.id, action: "kpi.scorecard.revision", entityType: "kpi_scorecard", entityId: scorecardId })
  await notify({ tenantId: c.tenantId, userId: result.managerId, type: "kpi_revision", title: "Karyawan minta revisi scorecard", body: `${c.session.user.name ?? "Karyawan"} meminta revisi scorecard KPI.${note ? ` Catatan: ${note}` : ""}`, data: { scorecardId } })
  revalidatePath("/dashboard/kpi")
  return { success: "Permintaan revisi terkirim" }
}

// ---------- Epic & Task (manajer/HR, planning) ----------

async function loadEditableScorecardByChild(
  tx: Database,
  actorUserId: string,
  isHr: boolean,
  opts: { epicId?: string; taskId?: string },
) {
  let scorecardId: string | undefined
  if (opts.taskId) {
    const t = await tx.query.kpiTasks.findFirst({ where: eq(kpiTasks.id, opts.taskId) })
    if (!t) return { error: "Task tidak ditemukan" as string }
    const e = await tx.query.kpiEpics.findFirst({ where: eq(kpiEpics.id, t.epicId) })
    scorecardId = e?.scorecardId
  } else if (opts.epicId) {
    const e = await tx.query.kpiEpics.findFirst({ where: eq(kpiEpics.id, opts.epicId) })
    scorecardId = e?.scorecardId
  }
  if (!scorecardId) return { error: "Data tidak ditemukan" as string }
  return loadEditableScorecard(tx, actorUserId, isHr, scorecardId)
}

export async function createEpic(scorecardId: string, _prev: State, formData: FormData): Promise<State> {
  const c = await ctx()
  if ("error" in c) return { error: c.error }
  const isHr = hasRole(c.session.user.roles, "hr_admin")
  const parsed = epicSchema.safeParse({ name: formData.get("name"), weight: formData.get("weight") })
  if (!parsed.success) return { error: parsed.error.errors[0].message }
  const result = await withTenantContext(c.tenantId, async (tx) => {
    const r = await loadEditableScorecard(tx, c.session.user.id, isHr, scorecardId)
    if ("error" in r) return { error: r.error }
    await tx.insert(kpiEpics).values({ tenantId: c.tenantId, scorecardId, name: parsed.data.name, weight: parsed.data.weight })
    return { ok: true }
  })
  if ("error" in result) return { error: result.error }
  revalidatePath(`/dashboard/kpi/team/${scorecardId}`)
  return { success: "Epic ditambahkan" }
}

export async function deleteEpic(epicId: string, scorecardId: string): Promise<State> {
  const c = await ctx()
  if ("error" in c) return { error: c.error }
  const isHr = hasRole(c.session.user.roles, "hr_admin")
  const result = await withTenantContext(c.tenantId, async (tx) => {
    const r = await loadEditableScorecardByChild(tx, c.session.user.id, isHr, { epicId })
    if ("error" in r) return { error: r.error }
    await tx.delete(kpiEpics).where(eq(kpiEpics.id, epicId))
    return { ok: true }
  })
  if ("error" in result) return { error: result.error }
  revalidatePath(`/dashboard/kpi/team/${scorecardId}`)
  return { success: "Epic dihapus" }
}

export async function createTask(epicId: string, scorecardId: string, _prev: State, formData: FormData): Promise<State> {
  const c = await ctx()
  if ("error" in c) return { error: c.error }
  const isHr = hasRole(c.session.user.roles, "hr_admin")
  const parsed = taskSchema.safeParse({ title: formData.get("title"), weight: formData.get("weight"), targetNote: formData.get("targetNote") })
  if (!parsed.success) return { error: parsed.error.errors[0].message }
  const rubric = parseRubric(formData)
  const result = await withTenantContext(c.tenantId, async (tx) => {
    const r = await loadEditableScorecardByChild(tx, c.session.user.id, isHr, { epicId })
    if ("error" in r) return { error: r.error }
    await tx.insert(kpiTasks).values({ tenantId: c.tenantId, epicId, title: parsed.data.title, weight: parsed.data.weight, targetNote: parsed.data.targetNote ?? null, rubric })
    return { ok: true }
  })
  if ("error" in result) return { error: result.error }
  revalidatePath(`/dashboard/kpi/team/${scorecardId}`)
  return { success: "Task ditambahkan" }
}

export async function deleteTask(taskId: string, scorecardId: string): Promise<State> {
  const c = await ctx()
  if ("error" in c) return { error: c.error }
  const isHr = hasRole(c.session.user.roles, "hr_admin")
  const result = await withTenantContext(c.tenantId, async (tx) => {
    const r = await loadEditableScorecardByChild(tx, c.session.user.id, isHr, { taskId })
    if ("error" in r) return { error: r.error }
    await tx.delete(kpiTasks).where(eq(kpiTasks.id, taskId))
    return { ok: true }
  })
  if ("error" in result) return { error: result.error }
  revalidatePath(`/dashboard/kpi/team/${scorecardId}`)
  return { success: "Task dihapus" }
}

// ---------- Sub-task (karyawan, period active) ----------

async function loadOwnedActiveTask(tx: Database, actorUserId: string, taskId: string) {
  const myEmployeeId = await getEmployeeIdByUser2(tx, actorUserId)
  const t = await tx.query.kpiTasks.findFirst({ where: eq(kpiTasks.id, taskId) })
  if (!t) return { error: "Task tidak ditemukan" as string }
  const e = await tx.query.kpiEpics.findFirst({ where: eq(kpiEpics.id, t.epicId) })
  const sc = e ? await tx.query.kpiScorecards.findFirst({ where: eq(kpiScorecards.id, e.scorecardId) }) : null
  if (!sc) return { error: "Scorecard tidak ditemukan" }
  if (sc.employeeId !== myEmployeeId) return { error: "Ini bukan KPI Anda" }
  return { sc, task: t }
}

export async function addSubtask(taskId: string, _prev: State, formData: FormData): Promise<State> {
  const c = await ctx()
  if ("error" in c) return { error: c.error }
  const parsed = subtaskSchema.safeParse({ title: formData.get("title") })
  if (!parsed.success) return { error: parsed.error.errors[0].message }
  const result = await withTenantContext(c.tenantId, async (tx) => {
    const r = await loadOwnedActiveTask(tx, c.session.user.id, taskId)
    if ("error" in r) return { error: r.error }
    if ((await periodStatusOf(tx, r.sc.periodId)) !== "active") return { error: "Sub-task hanya saat periode berjalan" }
    await tx.insert(kpiSubtasks).values({ tenantId: c.tenantId, taskId, title: parsed.data.title, createdById: c.session.user.id })
    return { ok: true }
  })
  if ("error" in result) return { error: result.error }
  revalidatePath("/dashboard/kpi")
  return { success: "Sub-task ditambahkan" }
}

export async function toggleSubtask(subtaskId: string): Promise<State> {
  const c = await ctx()
  if ("error" in c) return { error: c.error }
  const result = await withTenantContext(c.tenantId, async (tx) => {
    const st = await tx.query.kpiSubtasks.findFirst({ where: eq(kpiSubtasks.id, subtaskId) })
    if (!st) return { error: "Sub-task tidak ditemukan" as string }
    const r = await loadOwnedActiveTask(tx, c.session.user.id, st.taskId)
    if ("error" in r) return { error: r.error }
    await tx.update(kpiSubtasks).set({ isDone: !st.isDone }).where(eq(kpiSubtasks.id, subtaskId))
    return { ok: true }
  })
  if ("error" in result) return { error: result.error }
  revalidatePath("/dashboard/kpi")
  return { success: "Tersimpan" }
}

export async function deleteSubtask(subtaskId: string): Promise<State> {
  const c = await ctx()
  if ("error" in c) return { error: c.error }
  const result = await withTenantContext(c.tenantId, async (tx) => {
    const st = await tx.query.kpiSubtasks.findFirst({ where: eq(kpiSubtasks.id, subtaskId) })
    if (!st) return { error: "Sub-task tidak ditemukan" as string }
    const r = await loadOwnedActiveTask(tx, c.session.user.id, st.taskId)
    if ("error" in r) return { error: r.error }
    await tx.delete(kpiSubtasks).where(eq(kpiSubtasks.id, subtaskId))
    return { ok: true }
  })
  if ("error" in result) return { error: result.error }
  revalidatePath("/dashboard/kpi")
  return { success: "Sub-task dihapus" }
}

// ---------- Progres (karyawan) & feedback (manajer), period active ----------

export async function addProgress(_prev: State, formData: FormData): Promise<State> {
  const c = await ctx()
  if ("error" in c) return { error: c.error }
  const taskId = String(formData.get("taskId") ?? "")
  const parsed = progressSchema.safeParse({ percent: formData.get("percent"), note: formData.get("note") })
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const guard = await withTenantContext(c.tenantId, async (tx) => {
    const r = await loadOwnedActiveTask(tx, c.session.user.id, taskId)
    if ("error" in r) return { error: r.error }
    if ((await periodStatusOf(tx, r.sc.periodId)) !== "active") return { error: "Hanya saat periode berjalan" }
    return { managerId: r.sc.managerId, title: r.task.title }
  })
  if ("error" in guard) return { error: guard.error }

  let evidencePath: string | null = null
  let evidenceName: string | null = null
  const file = formData.get("evidence")
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_EVIDENCE) return { error: "Bukti maksimal 5MB" }
    if (!EVIDENCE_EXT.test(file.name)) return { error: "Bukti harus PDF atau gambar" }
    const buffer = Buffer.from(await file.arrayBuffer())
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    evidencePath = GCS_PATHS.kpiEvidence(c.tenantId, taskId, `${randomUUID()}-${safe}`)
    evidenceName = file.name
    await putObject(evidencePath, buffer, file.type || "application/octet-stream")
  }

  await withTenantContext(c.tenantId, (tx) =>
    tx.insert(kpiProgress).values({ tenantId: c.tenantId, taskId, percent: parsed.data.percent, note: parsed.data.note ?? null, evidencePath, evidenceName, createdById: c.session.user.id }),
  )
  await logAudit({ tenantId: c.tenantId, userId: c.session.user.id, action: "kpi.progress", entityType: "kpi_task", entityId: taskId, newValues: { percent: parsed.data.percent } })
  await notify({ tenantId: c.tenantId, userId: guard.managerId, type: "kpi_progress", title: "Progres KPI diperbarui", body: `${c.session.user.name ?? "Karyawan"} memperbarui progres "${guard.title}" ke ${parsed.data.percent}%.`, data: { taskId } })
  revalidatePath("/dashboard/kpi")
  return { success: "Progres tersimpan" }
}

export async function addFeedback(taskId: string, message: string): Promise<State> {
  const c = await ctx()
  if ("error" in c) return { error: c.error }
  const isHr = hasRole(c.session.user.roles, "hr_admin")
  const parsed = feedbackSchema.safeParse({ message })
  if (!parsed.success) return { error: parsed.error.errors[0].message }
  const result = await withTenantContext(c.tenantId, async (tx) => {
    const t = await tx.query.kpiTasks.findFirst({ where: eq(kpiTasks.id, taskId) })
    if (!t) return { error: "Task tidak ditemukan" as string }
    const e = await tx.query.kpiEpics.findFirst({ where: eq(kpiEpics.id, t.epicId) })
    const sc = e ? await tx.query.kpiScorecards.findFirst({ where: eq(kpiScorecards.id, e.scorecardId) }) : null
    if (!sc) return { error: "Scorecard tidak ditemukan" }
    if (!(await canManageEmployee(tx, c.session.user.id, isHr, sc.employeeId))) return { error: "Anda tidak berwenang" }
    if ((await periodStatusOf(tx, sc.periodId)) !== "active") return { error: "Feedback hanya saat periode berjalan" }
    await tx.insert(kpiFeedback).values({ tenantId: c.tenantId, taskId, fromUserId: c.session.user.id, message: parsed.data.message })
    const emp = await tx.query.employees.findFirst({ where: eq(employees.id, sc.employeeId) })
    return { employeeUserId: emp?.userId ?? null }
  })
  if ("error" in result) return { error: result.error }
  if (result.employeeUserId) {
    await notify({ tenantId: c.tenantId, userId: result.employeeUserId, type: "kpi_feedback", title: "Feedback KPI dari atasan", body: "Atasan memberi feedback pada KPI Anda.", data: { taskId } })
  }
  revalidatePath("/dashboard/kpi/team")
  return { success: "Feedback terkirim" }
}

// ---------- Penilaian (Fase C) ----------

// Upsert appraisal helper.
async function upsertAppraisal(tx: Database, tenantId: string, taskId: string, set: Record<string, unknown>) {
  await tx
    .insert(kpiAppraisals)
    .values({ tenantId, taskId, ...set })
    .onConflictDoUpdate({ target: kpiAppraisals.taskId, set: { ...set, updatedAt: new Date() } })
}

export async function setRealizationSelf(_prev: State, formData: FormData): Promise<State> {
  const c = await ctx()
  if ("error" in c) return { error: c.error }
  const taskId = String(formData.get("taskId") ?? "")
  const parsed = realizationSchema.safeParse({ realization: formData.get("realization"), selfScore: formData.get("selfScore") })
  if (!parsed.success) return { error: parsed.error.errors[0].message }
  const result = await withTenantContext(c.tenantId, async (tx) => {
    const r = await loadOwnedActiveTask(tx, c.session.user.id, taskId)
    if ("error" in r) return { error: r.error }
    if ((await periodStatusOf(tx, r.sc.periodId)) !== "appraisal") return { error: "Hanya saat tahap penilaian" }
    await upsertAppraisal(tx, c.tenantId, taskId, { realization: parsed.data.realization ?? null, selfScore: parsed.data.selfScore })
    return { ok: true }
  })
  if ("error" in result) return { error: result.error }
  revalidatePath("/dashboard/kpi")
  return { success: "Penilaian diri tersimpan" }
}

export async function setManagerScore(_prev: State, formData: FormData): Promise<State> {
  const c = await ctx()
  if ("error" in c) return { error: c.error }
  const isHr = hasRole(c.session.user.roles, "hr_admin")
  const taskId = String(formData.get("taskId") ?? "")
  const parsed = managerScoreSchema.safeParse({ managerScore: formData.get("managerScore"), managerNote: formData.get("managerNote"), notesOnAchievement: formData.get("notesOnAchievement") })
  if (!parsed.success) return { error: parsed.error.errors[0].message }
  const result = await withTenantContext(c.tenantId, async (tx) => {
    const t = await tx.query.kpiTasks.findFirst({ where: eq(kpiTasks.id, taskId) })
    if (!t) return { error: "Task tidak ditemukan" as string }
    const e = await tx.query.kpiEpics.findFirst({ where: eq(kpiEpics.id, t.epicId) })
    const sc = e ? await tx.query.kpiScorecards.findFirst({ where: eq(kpiScorecards.id, e.scorecardId) }) : null
    if (!sc) return { error: "Scorecard tidak ditemukan" }
    if (!(await canManageEmployee(tx, c.session.user.id, isHr, sc.employeeId))) return { error: "Anda tidak berwenang menilai" }
    if ((await periodStatusOf(tx, sc.periodId)) !== "appraisal") return { error: "Hanya saat tahap penilaian" }
    const score = parsed.data.managerScore
    await upsertAppraisal(tx, c.tenantId, taskId, { managerScore: score, managerNote: parsed.data.managerNote ?? null, notesOnAchievement: parsed.data.notesOnAchievement ?? null, finalScore: score })
    return { ok: true }
  })
  if ("error" in result) return { error: result.error }
  await logAudit({ tenantId: c.tenantId, userId: c.session.user.id, action: "kpi.manager_score", entityType: "kpi_task", entityId: taskId, newValues: { managerScore: parsed.data.managerScore } })
  revalidatePath("/dashboard/kpi/team")
  return { success: "Nilai tersimpan" }
}

export async function calibrateFinalScore(_prev: State, formData: FormData): Promise<State> {
  const c = await requireHr()
  if ("error" in c) return { error: c.error }
  const taskId = String(formData.get("taskId") ?? "")
  const parsed = calibrateSchema.safeParse({ finalScore: formData.get("finalScore") })
  if (!parsed.success) return { error: parsed.error.errors[0].message }
  const result = await withTenantContext(c.tenantId, async (tx) => {
    const t = await tx.query.kpiTasks.findFirst({ where: eq(kpiTasks.id, taskId) })
    if (!t) return { error: "Task tidak ditemukan" as string }
    const e = await tx.query.kpiEpics.findFirst({ where: eq(kpiEpics.id, t.epicId) })
    const sc = e ? await tx.query.kpiScorecards.findFirst({ where: eq(kpiScorecards.id, e.scorecardId) }) : null
    if (!sc) return { error: "Scorecard tidak ditemukan" }
    if ((await periodStatusOf(tx, sc.periodId)) !== "locked") return { error: "Kalibrasi hanya saat periode terkunci" }
    await upsertAppraisal(tx, c.tenantId, taskId, { finalScore: parsed.data.finalScore, calibratedById: c.session.user.id })
    return { ok: true }
  })
  if ("error" in result) return { error: result.error }
  await logAudit({ tenantId: c.tenantId, userId: c.session.user.id, action: "kpi.calibrate", entityType: "kpi_task", entityId: taskId, newValues: { finalScore: parsed.data.finalScore } })
  revalidatePath("/dashboard/kpi/team")
  return { success: "Skor akhir dikalibrasi" }
}
