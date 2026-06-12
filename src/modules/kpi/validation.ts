// Logika murni KPI berjenjang (Epic → Task): validasi bobot 2 tingkat + skor bertingkat.

// ---------- Validasi bobot (perencanaan) ----------

export interface EpicWeightInput {
  name: string
  weight: number
  taskWeights: number[]
}

/**
 * Masalah bobot satu scorecard. Kosong = valid.
 * Aturan: Σ bobot Epic = 100; tiap Epic punya ≥1 Task dgn Σ bobot Task = 100.
 */
export function scorecardWeightProblems(epics: EpicWeightInput[]): string[] {
  if (epics.length === 0) return ["Belum ada Epic"]
  const problems: string[] = []

  const epicTotal = epics.reduce((s, e) => s + e.weight, 0)
  if (epicTotal !== 100) problems.push(`Total bobot Epic ${epicTotal}% (harus 100%)`)

  for (const e of epics) {
    if (e.taskWeights.length === 0) {
      problems.push(`Epic "${e.name}": belum ada Task`)
      continue
    }
    const taskTotal = e.taskWeights.reduce((s, w) => s + w, 0)
    if (taskTotal !== 100) {
      problems.push(`Epic "${e.name}": total bobot Task ${taskTotal}% (harus 100%)`)
    }
  }
  return problems
}

// ---------- Guard aktivasi periode (Opsi A) ----------

export interface EmployeeScorecardState {
  employeeName: string | null
  hasScorecard: boolean
  agreed: boolean
  weightProblems: string[]
}

/**
 * Masalah aktivasi periode. Kosong = boleh diaktifkan.
 * Setiap karyawan wajib (ber-atasan) harus punya scorecard agreed & bobot valid.
 */
export function activationProblems(states: EmployeeScorecardState[]): string[] {
  if (states.length === 0) return ["Tidak ada karyawan yang wajib memiliki KPI"]
  const problems: string[] = []
  for (const s of states) {
    const who = s.employeeName ?? "Karyawan"
    if (!s.hasScorecard) {
      problems.push(`${who}: belum ada scorecard KPI`)
      continue
    }
    if (s.weightProblems.length > 0) {
      for (const p of s.weightProblems) problems.push(`${who} — ${p}`)
    }
    if (!s.agreed) {
      problems.push(`${who}: scorecard belum disetujui`)
    }
  }
  return problems
}

// ---------- Skor bertingkat (penilaian) ----------

export interface ScoredTask {
  weight: number
  finalScore: number | null
}

export interface ScoredEpic {
  weight: number
  tasks: ScoredTask[]
}

/** Skor Epic = Σ(finalScore × bobotTask/100). null bila ada task belum dinilai. */
export function epicScore(tasks: ScoredTask[]): number | null {
  if (tasks.length === 0) return null
  let sum = 0
  for (const t of tasks) {
    if (t.finalScore == null) return null
    sum += t.finalScore * (t.weight / 100)
  }
  return Math.round(sum * 100) / 100
}

/**
 * Skor akhir scorecard = Σ(skorEpic × bobotEpic/100), rentang 1–5.
 * null bila ada epic/task yang belum lengkap dinilai.
 */
export function scorecardScore(epics: ScoredEpic[]): number | null {
  if (epics.length === 0) return null
  let sum = 0
  for (const e of epics) {
    const es = epicScore(e.tasks)
    if (es == null) return null
    sum += es * (e.weight / 100)
  }
  return Math.round(sum * 100) / 100
}

// ---------- Guard penguncian periode (Fase C) ----------

export interface ManagerScoreRow {
  employeeName: string | null
  managerScore: number | null
}

/** Task yang belum dinilai manajer — menghalangi penguncian periode. */
export function lockProblems(rows: ManagerScoreRow[]): string[] {
  const missing = rows.filter((r) => r.managerScore == null)
  if (missing.length === 0) return []
  const names = [...new Set(missing.map((r) => r.employeeName ?? "Karyawan"))]
  return [`Masih ada ${missing.length} KPI belum dinilai manajer (${names.join(", ")})`]
}
