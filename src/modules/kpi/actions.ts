"use server"
import { randomUUID } from "crypto"
import { auth, hasRole } from "@/lib/auth"
import { withTenantContext } from "@/lib/db"
import {
  kpiPeriods,
  companyObjectives,
  kpis,
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
import { getEmployeeIdByUser } from "@/modules/attendance/queries"
import {
  periodCreateSchema,
  objectiveCreateSchema,
  kpiCreateSchema,
  kpiUpdateSchema,
  progressSchema,
  feedbackSchema,
  selfScoreSchema,
  managerScoreSchema,
  calibrateSchema,
} from "./schema"
import { listWeightRows, listScoreRows } from "./queries"
import { activationProblems, lockProblems } from "./validation"
import { eq, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"

const MAX_EVIDENCE = 5 * 1024 * 1024 // 5 MB
const EVIDENCE_EXT = /\.(pdf|png|jpe?g|webp)$/i

type State = { error?: string; success?: string }

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

  await withTenantContext(c.tenantId, async (tx) => {
    await tx.insert(kpiPeriods).values({
      tenantId: c.tenantId,
      name: d.name,
      type: d.type,
      startDate: new Date(d.startDate),
      endDate: new Date(d.endDate),
    })
  })
  await logAudit({
    tenantId: c.tenantId,
    userId: c.session.user.id,
    action: "kpi.period.create",
    entityType: "kpi_period",
    newValues: { name: d.name, type: d.type },
  })
  revalidatePath("/dashboard/kpi/periods")
  return { success: "Periode dibuat" }
}

export async function activatePeriod(periodId: string): Promise<State> {
  const c = await requireHr()
  if ("error" in c) return { error: c.error }

  const period = await withTenantContext(c.tenantId, (tx) =>
    tx.query.kpiPeriods.findFirst({ where: eq(kpiPeriods.id, periodId) }),
  )
  if (!period) return { error: "Periode tidak ditemukan" }
  if (period.status !== "planning") return { error: "Hanya periode perencanaan yang bisa diaktifkan" }

  const rows = await listWeightRows(c.tenantId, periodId)
  const problems = activationProblems(rows)
  if (problems.length > 0) {
    return { error: `Belum bisa diaktifkan — ${problems.join("; ")}` }
  }

  await withTenantContext(c.tenantId, (tx) =>
    tx.update(kpiPeriods).set({ status: "active", updatedAt: new Date() }).where(eq(kpiPeriods.id, periodId)),
  )
  await logAudit({
    tenantId: c.tenantId,
    userId: c.session.user.id,
    action: "kpi.period.activate",
    entityType: "kpi_period",
    entityId: periodId,
  })
  revalidatePath("/dashboard/kpi/periods")
  return { success: "Periode diaktifkan" }
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

  await logAudit({
    tenantId: c.tenantId,
    userId: c.session.user.id,
    action: "kpi.period.delete",
    entityType: "kpi_period",
    entityId: periodId,
  })
  revalidatePath("/dashboard/kpi/periods")
  return { success: "Periode dihapus" }
}

// ---------- Company objectives (HR) ----------

export async function addObjective(_prev: State, formData: FormData): Promise<State> {
  const c = await requireHr()
  if ("error" in c) return { error: c.error }

  const periodId = String(formData.get("periodId") ?? "")
  if (!periodId) return { error: "Periode tidak valid" }
  const parsed = objectiveCreateSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
  })
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const ok = await withTenantContext(c.tenantId, async (tx) => {
    const p = await tx.query.kpiPeriods.findFirst({ where: eq(kpiPeriods.id, periodId) })
    if (!p) return false
    await tx.insert(companyObjectives).values({
      tenantId: c.tenantId,
      periodId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
    })
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

// ---------- KPI (manajer / HR) ----------

// Otorisasi: HR, atau atasan langsung dari karyawan target.
async function canManage(
  tenantId: string,
  actorUserId: string,
  isHr: boolean,
  employeeId: string,
): Promise<boolean> {
  if (isHr) return true
  return withTenantContext(tenantId, async (tx) => {
    const emp = await tx.query.employees.findFirst({ where: eq(employees.id, employeeId) })
    if (!emp?.reportsToId) return false
    const me = await tx.query.employees.findFirst({ where: eq(employees.userId, actorUserId) })
    return !!me && emp.reportsToId === me.id
  })
}

async function requirePlanning(tenantId: string, periodId: string): Promise<boolean> {
  const p = await withTenantContext(tenantId, (tx) =>
    tx.query.kpiPeriods.findFirst({ where: eq(kpiPeriods.id, periodId) }),
  )
  return p?.status === "planning"
}

export async function createKpi(_prev: State, formData: FormData): Promise<State> {
  const c = await ctx()
  if ("error" in c) return { error: c.error }
  const isHr = hasRole(c.session.user.roles, "hr_admin")

  const periodId = String(formData.get("periodId") ?? "")
  if (!periodId) return { error: "Periode tidak valid" }
  const parsed = kpiCreateSchema.safeParse({
    employeeId: formData.get("employeeId"),
    title: formData.get("title"),
    description: formData.get("description"),
    weight: formData.get("weight"),
    target: formData.get("target"),
  })
  if (!parsed.success) return { error: parsed.error.errors[0].message }
  const d = parsed.data

  if (!(await requirePlanning(c.tenantId, periodId))) {
    return { error: "KPI hanya bisa disusun saat periode perencanaan" }
  }
  if (!(await canManage(c.tenantId, c.session.user.id, isHr, d.employeeId))) {
    return { error: "Anda hanya bisa membuat KPI untuk bawahan langsung" }
  }

  await withTenantContext(c.tenantId, (tx) =>
    tx.insert(kpis).values({
      tenantId: c.tenantId,
      periodId,
      employeeId: d.employeeId,
      managerId: c.session.user.id,
      title: d.title,
      description: d.description ?? null,
      weight: d.weight,
      target: d.target ?? null,
    }),
  )
  await logAudit({
    tenantId: c.tenantId,
    userId: c.session.user.id,
    action: "kpi.create",
    entityType: "kpi",
    newValues: { employeeId: d.employeeId, title: d.title, weight: d.weight },
  })
  revalidatePath("/dashboard/kpi/team")
  return { success: "KPI dibuat (draf)" }
}

// Memuat KPI + cek otorisasi & periode planning. Mengembalikan kpi atau error.
async function loadManageableKpi(
  tenantId: string,
  actorUserId: string,
  isHr: boolean,
  kpiId: string,
) {
  const kpi = await withTenantContext(tenantId, (tx) =>
    tx.query.kpis.findFirst({ where: eq(kpis.id, kpiId) }),
  )
  if (!kpi) return { error: "KPI tidak ditemukan" as string }
  if (!(await requirePlanning(tenantId, kpi.periodId))) {
    return { error: "Periode sudah tidak dalam perencanaan" }
  }
  if (!(await canManage(tenantId, actorUserId, isHr, kpi.employeeId))) {
    return { error: "Anda tidak berwenang atas KPI ini" }
  }
  return { kpi }
}

export async function updateKpi(kpiId: string, _prev: State, formData: FormData): Promise<State> {
  const c = await ctx()
  if ("error" in c) return { error: c.error }
  const isHr = hasRole(c.session.user.roles, "hr_admin")

  const parsed = kpiUpdateSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    weight: formData.get("weight"),
    target: formData.get("target"),
  })
  if (!parsed.success) return { error: parsed.error.errors[0].message }
  const d = parsed.data

  const loaded = await loadManageableKpi(c.tenantId, c.session.user.id, isHr, kpiId)
  if ("error" in loaded) return { error: loaded.error }
  if (!["draft", "revision_requested"].includes(loaded.kpi.status)) {
    return { error: "Hanya KPI draf / minta-revisi yang bisa diubah" }
  }

  await withTenantContext(c.tenantId, (tx) =>
    tx
      .update(kpis)
      .set({
        title: d.title,
        description: d.description ?? null,
        weight: d.weight,
        target: d.target ?? null,
        status: "draft",
        revisionNote: null,
        updatedAt: new Date(),
      })
      .where(eq(kpis.id, kpiId)),
  )
  revalidatePath("/dashboard/kpi/team")
  return { success: "KPI diperbarui" }
}

export async function deleteKpi(kpiId: string): Promise<State> {
  const c = await ctx()
  if ("error" in c) return { error: c.error }
  const isHr = hasRole(c.session.user.roles, "hr_admin")

  const loaded = await loadManageableKpi(c.tenantId, c.session.user.id, isHr, kpiId)
  if ("error" in loaded) return { error: loaded.error }
  if (loaded.kpi.status !== "draft") return { error: "Hanya KPI draf yang bisa dihapus" }

  await withTenantContext(c.tenantId, (tx) => tx.delete(kpis).where(eq(kpis.id, kpiId)))
  await logAudit({
    tenantId: c.tenantId,
    userId: c.session.user.id,
    action: "kpi.delete",
    entityType: "kpi",
    entityId: kpiId,
  })
  revalidatePath("/dashboard/kpi/team")
  return { success: "KPI dihapus" }
}

export async function sendKpi(kpiId: string): Promise<State> {
  const c = await ctx()
  if ("error" in c) return { error: c.error }
  const isHr = hasRole(c.session.user.roles, "hr_admin")

  const loaded = await loadManageableKpi(c.tenantId, c.session.user.id, isHr, kpiId)
  if ("error" in loaded) return { error: loaded.error }
  if (!["draft", "revision_requested"].includes(loaded.kpi.status)) {
    return { error: "KPI ini sudah dikirim" }
  }

  const employeeUserId = await withTenantContext(c.tenantId, async (tx) => {
    await tx
      .update(kpis)
      .set({ status: "proposed", revisionNote: null, updatedAt: new Date() })
      .where(eq(kpis.id, kpiId))
    const emp = await tx.query.employees.findFirst({ where: eq(employees.id, loaded.kpi.employeeId) })
    return emp?.userId ?? null
  })

  await logAudit({
    tenantId: c.tenantId,
    userId: c.session.user.id,
    action: "kpi.send",
    entityType: "kpi",
    entityId: kpiId,
  })
  if (employeeUserId) {
    await notify({
      tenantId: c.tenantId,
      userId: employeeUserId,
      type: "kpi_proposed",
      title: "KPI baru menunggu persetujuan",
      body: `KPI "${loaded.kpi.title}" dikirim untuk Anda setujui.`,
      data: { kpiId },
    })
  }
  revalidatePath("/dashboard/kpi/team")
  return { success: "KPI dikirim ke karyawan" }
}

// ---------- KPI (karyawan: setuju / minta revisi) ----------

// Memuat KPI milik karyawan yang sedang login & periode planning.
async function loadOwnedProposedKpi(tenantId: string, actorUserId: string, kpiId: string) {
  const myEmployeeId = await getEmployeeIdByUser(tenantId, actorUserId)
  if (!myEmployeeId) return { error: "Data karyawan tidak ditemukan" as string }

  const kpi = await withTenantContext(tenantId, (tx) =>
    tx.query.kpis.findFirst({ where: eq(kpis.id, kpiId) }),
  )
  if (!kpi) return { error: "KPI tidak ditemukan" }
  if (kpi.employeeId !== myEmployeeId) return { error: "Ini bukan KPI Anda" }
  if (!(await requirePlanning(tenantId, kpi.periodId))) {
    return { error: "Periode sudah tidak dalam perencanaan" }
  }
  if (kpi.status !== "proposed") return { error: "KPI ini sudah diproses" }
  return { kpi }
}

export async function agreeKpi(kpiId: string): Promise<State> {
  const c = await ctx()
  if ("error" in c) return { error: c.error }

  const loaded = await loadOwnedProposedKpi(c.tenantId, c.session.user.id, kpiId)
  if ("error" in loaded) return { error: loaded.error }

  await withTenantContext(c.tenantId, (tx) =>
    tx
      .update(kpis)
      .set({ status: "agreed", agreedAt: new Date(), revisionNote: null, updatedAt: new Date() })
      .where(eq(kpis.id, kpiId)),
  )
  await logAudit({
    tenantId: c.tenantId,
    userId: c.session.user.id,
    action: "kpi.agree",
    entityType: "kpi",
    entityId: kpiId,
  })
  await notify({
    tenantId: c.tenantId,
    userId: loaded.kpi.managerId,
    type: "kpi_agreed",
    title: "KPI disetujui karyawan",
    body: `${c.session.user.name ?? "Karyawan"} menyetujui KPI "${loaded.kpi.title}".`,
    data: { kpiId },
  })
  revalidatePath("/dashboard/kpi")
  return { success: "KPI disetujui" }
}

export async function requestRevisionKpi(kpiId: string, note: string): Promise<State> {
  const c = await ctx()
  if ("error" in c) return { error: c.error }

  const loaded = await loadOwnedProposedKpi(c.tenantId, c.session.user.id, kpiId)
  if ("error" in loaded) return { error: loaded.error }

  await withTenantContext(c.tenantId, (tx) =>
    tx
      .update(kpis)
      .set({ status: "revision_requested", revisionNote: note?.trim() || null, updatedAt: new Date() })
      .where(eq(kpis.id, kpiId)),
  )
  await logAudit({
    tenantId: c.tenantId,
    userId: c.session.user.id,
    action: "kpi.request_revision",
    entityType: "kpi",
    entityId: kpiId,
  })
  await notify({
    tenantId: c.tenantId,
    userId: loaded.kpi.managerId,
    type: "kpi_revision",
    title: "Karyawan minta revisi KPI",
    body: `${c.session.user.name ?? "Karyawan"} meminta revisi KPI "${loaded.kpi.title}".${note ? ` Catatan: ${note}` : ""}`,
    data: { kpiId },
  })
  revalidatePath("/dashboard/kpi")
  return { success: "Permintaan revisi terkirim" }
}

// ---------- Fase B: progres (karyawan) & feedback (manajer) ----------

// KPI milik karyawan login, status agreed, periode active.
async function loadTrackableKpi(tenantId: string, actorUserId: string, kpiId: string) {
  const myEmployeeId = await getEmployeeIdByUser(tenantId, actorUserId)
  if (!myEmployeeId) return { error: "Data karyawan tidak ditemukan" as string }

  const kpi = await withTenantContext(tenantId, (tx) =>
    tx.query.kpis.findFirst({ where: eq(kpis.id, kpiId) }),
  )
  if (!kpi) return { error: "KPI tidak ditemukan" }
  if (kpi.employeeId !== myEmployeeId) return { error: "Ini bukan KPI Anda" }
  if (kpi.status !== "agreed") return { error: "KPI belum disetujui" }

  const period = await withTenantContext(tenantId, (tx) =>
    tx.query.kpiPeriods.findFirst({ where: eq(kpiPeriods.id, kpi.periodId) }),
  )
  if (period?.status !== "active") return { error: "Periode belum berjalan" }
  return { kpi }
}

export async function addProgress(_prev: State, formData: FormData): Promise<State> {
  const c = await ctx()
  if ("error" in c) return { error: c.error }

  const kpiId = String(formData.get("kpiId") ?? "")
  if (!kpiId) return { error: "KPI tidak valid" }
  const parsed = progressSchema.safeParse({
    percent: formData.get("percent"),
    note: formData.get("note"),
  })
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const loaded = await loadTrackableKpi(c.tenantId, c.session.user.id, kpiId)
  if ("error" in loaded) return { error: loaded.error }

  // Bukti opsional
  let evidencePath: string | null = null
  let evidenceName: string | null = null
  const file = formData.get("evidence")
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_EVIDENCE) return { error: "Bukti maksimal 5MB" }
    if (!EVIDENCE_EXT.test(file.name)) return { error: "Bukti harus PDF atau gambar" }
    const buffer = Buffer.from(await file.arrayBuffer())
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    evidencePath = GCS_PATHS.kpiEvidence(c.tenantId, kpiId, `${randomUUID()}-${safe}`)
    evidenceName = file.name
    await putObject(evidencePath, buffer, file.type || "application/octet-stream")
  }

  await withTenantContext(c.tenantId, (tx) =>
    tx.insert(kpiProgress).values({
      tenantId: c.tenantId,
      kpiId,
      percent: parsed.data.percent,
      note: parsed.data.note ?? null,
      evidencePath,
      evidenceName,
      createdById: c.session.user.id,
    }),
  )
  await logAudit({
    tenantId: c.tenantId,
    userId: c.session.user.id,
    action: "kpi.progress",
    entityType: "kpi",
    entityId: kpiId,
    newValues: { percent: parsed.data.percent },
  })
  await notify({
    tenantId: c.tenantId,
    userId: loaded.kpi.managerId,
    type: "kpi_progress",
    title: "Progres KPI diperbarui",
    body: `${c.session.user.name ?? "Karyawan"} memperbarui progres "${loaded.kpi.title}" ke ${parsed.data.percent}%.`,
    data: { kpiId },
  })
  revalidatePath("/dashboard/kpi")
  return { success: "Progres tersimpan" }
}

export async function addFeedback(kpiId: string, message: string): Promise<State> {
  const c = await ctx()
  if ("error" in c) return { error: c.error }
  const isHr = hasRole(c.session.user.roles, "hr_admin")

  const parsed = feedbackSchema.safeParse({ message })
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const kpi = await withTenantContext(c.tenantId, (tx) =>
    tx.query.kpis.findFirst({ where: eq(kpis.id, kpiId) }),
  )
  if (!kpi) return { error: "KPI tidak ditemukan" }
  if (!(await canManage(c.tenantId, c.session.user.id, isHr, kpi.employeeId))) {
    return { error: "Anda tidak berwenang atas KPI ini" }
  }
  const period = await withTenantContext(c.tenantId, (tx) =>
    tx.query.kpiPeriods.findFirst({ where: eq(kpiPeriods.id, kpi.periodId) }),
  )
  if (period?.status !== "active") return { error: "Feedback hanya saat periode berjalan" }

  const employeeUserId = await withTenantContext(c.tenantId, async (tx) => {
    await tx.insert(kpiFeedback).values({
      tenantId: c.tenantId,
      kpiId,
      fromUserId: c.session.user.id,
      message: parsed.data.message,
    })
    const emp = await tx.query.employees.findFirst({ where: eq(employees.id, kpi.employeeId) })
    return emp?.userId ?? null
  })
  await logAudit({
    tenantId: c.tenantId,
    userId: c.session.user.id,
    action: "kpi.feedback",
    entityType: "kpi",
    entityId: kpiId,
  })
  if (employeeUserId) {
    await notify({
      tenantId: c.tenantId,
      userId: employeeUserId,
      type: "kpi_feedback",
      title: "Feedback KPI dari atasan",
      body: `Atasan memberi feedback pada "${kpi.title}".`,
      data: { kpiId },
    })
  }
  revalidatePath("/dashboard/kpi/team")
  return { success: "Feedback terkirim" }
}

// ---------- Fase C: penilaian (appraisal) ----------

async function periodStatusOf(tenantId: string, periodId: string): Promise<string | undefined> {
  const p = await withTenantContext(tenantId, (tx) =>
    tx.query.kpiPeriods.findFirst({ where: eq(kpiPeriods.id, periodId) }),
  )
  return p?.status
}

// HR: active → appraisal
export async function startAppraisal(periodId: string): Promise<State> {
  const c = await requireHr()
  if ("error" in c) return { error: c.error }
  if ((await periodStatusOf(c.tenantId, periodId)) !== "active") {
    return { error: "Hanya periode berjalan yang bisa masuk penilaian" }
  }
  await withTenantContext(c.tenantId, (tx) =>
    tx.update(kpiPeriods).set({ status: "appraisal", updatedAt: new Date() }).where(eq(kpiPeriods.id, periodId)),
  )
  await logAudit({ tenantId: c.tenantId, userId: c.session.user.id, action: "kpi.period.appraisal", entityType: "kpi_period", entityId: periodId })
  revalidatePath("/dashboard/kpi/periods")
  return { success: "Periode masuk tahap penilaian" }
}

// HR: appraisal → locked (guard: semua KPI sudah dinilai manajer)
export async function lockPeriod(periodId: string): Promise<State> {
  const c = await requireHr()
  if ("error" in c) return { error: c.error }
  if ((await periodStatusOf(c.tenantId, periodId)) !== "appraisal") {
    return { error: "Hanya periode penilaian yang bisa dikunci" }
  }
  const rows = await listScoreRows(c.tenantId, periodId)
  const problems = lockProblems(rows)
  if (problems.length > 0) return { error: `Belum bisa dikunci — ${problems.join("; ")}` }

  await withTenantContext(c.tenantId, (tx) =>
    tx.update(kpiPeriods).set({ status: "locked", updatedAt: new Date() }).where(eq(kpiPeriods.id, periodId)),
  )
  await logAudit({ tenantId: c.tenantId, userId: c.session.user.id, action: "kpi.period.lock", entityType: "kpi_period", entityId: periodId })
  revalidatePath("/dashboard/kpi/periods")
  return { success: "Periode dikunci" }
}

// Memuat KPI + periode dgn status tertentu.
async function loadKpiInStatus(tenantId: string, kpiId: string, status: string) {
  const kpi = await withTenantContext(tenantId, (tx) =>
    tx.query.kpis.findFirst({ where: eq(kpis.id, kpiId) }),
  )
  if (!kpi) return { error: "KPI tidak ditemukan" as string }
  if ((await periodStatusOf(tenantId, kpi.periodId)) !== status) {
    return { error: "Aksi tidak sesuai tahap periode" }
  }
  return { kpi }
}

// Karyawan: self-assessment (periode appraisal).
export async function setSelfScore(_prev: State, formData: FormData): Promise<State> {
  const c = await ctx()
  if ("error" in c) return { error: c.error }
  const kpiId = String(formData.get("kpiId") ?? "")
  const parsed = selfScoreSchema.safeParse({
    selfScore: formData.get("selfScore"),
    selfNote: formData.get("selfNote"),
  })
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const myEmployeeId = await getEmployeeIdByUser(c.tenantId, c.session.user.id)
  const loaded = await loadKpiInStatus(c.tenantId, kpiId, "appraisal")
  if ("error" in loaded) return { error: loaded.error }
  if (loaded.kpi.employeeId !== myEmployeeId) return { error: "Ini bukan KPI Anda" }

  await withTenantContext(c.tenantId, (tx) =>
    tx
      .insert(kpiAppraisals)
      .values({ tenantId: c.tenantId, kpiId, selfScore: parsed.data.selfScore, selfNote: parsed.data.selfNote ?? null })
      .onConflictDoUpdate({
        target: kpiAppraisals.kpiId,
        set: { selfScore: parsed.data.selfScore, selfNote: parsed.data.selfNote ?? null, updatedAt: new Date() },
      }),
  )
  await logAudit({ tenantId: c.tenantId, userId: c.session.user.id, action: "kpi.self_score", entityType: "kpi", entityId: kpiId })
  revalidatePath("/dashboard/kpi")
  return { success: "Penilaian diri tersimpan" }
}

// Manajer/HR: manager scoring (periode appraisal). finalScore default = managerScore.
export async function setManagerScore(_prev: State, formData: FormData): Promise<State> {
  const c = await ctx()
  if ("error" in c) return { error: c.error }
  const isHr = hasRole(c.session.user.roles, "hr_admin")
  const kpiId = String(formData.get("kpiId") ?? "")
  const parsed = managerScoreSchema.safeParse({
    managerScore: formData.get("managerScore"),
    managerNote: formData.get("managerNote"),
  })
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const loaded = await loadKpiInStatus(c.tenantId, kpiId, "appraisal")
  if ("error" in loaded) return { error: loaded.error }
  if (!(await canManage(c.tenantId, c.session.user.id, isHr, loaded.kpi.employeeId))) {
    return { error: "Anda tidak berwenang menilai KPI ini" }
  }

  const score = parsed.data.managerScore
  await withTenantContext(c.tenantId, (tx) =>
    tx
      .insert(kpiAppraisals)
      .values({ tenantId: c.tenantId, kpiId, managerScore: score, managerNote: parsed.data.managerNote ?? null, finalScore: score })
      .onConflictDoUpdate({
        target: kpiAppraisals.kpiId,
        set: { managerScore: score, managerNote: parsed.data.managerNote ?? null, finalScore: score, updatedAt: new Date() },
      }),
  )
  await logAudit({ tenantId: c.tenantId, userId: c.session.user.id, action: "kpi.manager_score", entityType: "kpi", entityId: kpiId, newValues: { managerScore: score } })
  revalidatePath("/dashboard/kpi/team")
  return { success: "Nilai tersimpan" }
}

// HR: kalibrasi finalScore (periode locked).
export async function calibrateFinalScore(_prev: State, formData: FormData): Promise<State> {
  const c = await requireHr()
  if ("error" in c) return { error: c.error }
  const kpiId = String(formData.get("kpiId") ?? "")
  const parsed = calibrateSchema.safeParse({ finalScore: formData.get("finalScore") })
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const loaded = await loadKpiInStatus(c.tenantId, kpiId, "locked")
  if ("error" in loaded) return { error: loaded.error }

  await withTenantContext(c.tenantId, (tx) =>
    tx
      .insert(kpiAppraisals)
      .values({ tenantId: c.tenantId, kpiId, finalScore: parsed.data.finalScore, calibratedById: c.session.user.id })
      .onConflictDoUpdate({
        target: kpiAppraisals.kpiId,
        set: { finalScore: parsed.data.finalScore, calibratedById: c.session.user.id, updatedAt: new Date() },
      }),
  )
  await logAudit({ tenantId: c.tenantId, userId: c.session.user.id, action: "kpi.calibrate", entityType: "kpi", entityId: kpiId, newValues: { finalScore: parsed.data.finalScore } })
  revalidatePath("/dashboard/kpi/team")
  return { success: "Skor akhir dikalibrasi" }
}
