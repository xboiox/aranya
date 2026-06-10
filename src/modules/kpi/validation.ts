// Logika murni untuk guard aktivasi periode (planning → active).

export interface KpiWeightRow {
  employeeId: string
  employeeName: string | null
  weight: number
  status: string
}

export interface EmployeeWeightSummary {
  employeeId: string
  employeeName: string | null
  totalWeight: number
  count: number
  allAgreed: boolean
}

export function summarizeWeights(rows: KpiWeightRow[]): EmployeeWeightSummary[] {
  const byEmp = new Map<string, EmployeeWeightSummary>()
  for (const r of rows) {
    const cur =
      byEmp.get(r.employeeId) ??
      { employeeId: r.employeeId, employeeName: r.employeeName, totalWeight: 0, count: 0, allAgreed: true }
    cur.totalWeight += r.weight
    cur.count += 1
    if (r.status !== "agreed") cur.allAgreed = false
    byEmp.set(r.employeeId, cur)
  }
  return [...byEmp.values()]
}

/**
 * Masalah yang menghalangi aktivasi periode. Kosong = boleh diaktifkan.
 * Setiap karyawan yang punya KPI: total bobot harus 100% dan semua KPI agreed.
 */
export function activationProblems(rows: KpiWeightRow[]): string[] {
  const summary = summarizeWeights(rows)
  if (summary.length === 0) {
    return ["Belum ada KPI yang dibuat untuk periode ini"]
  }
  const problems: string[] = []
  for (const s of summary) {
    const who = s.employeeName ?? "Karyawan"
    if (s.totalWeight !== 100) {
      problems.push(`${who}: total bobot ${s.totalWeight}% (harus 100%)`)
    }
    if (!s.allAgreed) {
      problems.push(`${who}: masih ada KPI yang belum disetujui`)
    }
  }
  return problems
}

// ---------- Fase C: penilaian ----------

export interface ScoredKpi {
  weight: number
  finalScore: number | null
}

/**
 * Skor akhir karyawan per periode = Σ(bobot/100 × finalScore), rentang 1–5.
 * Mengembalikan null bila ada KPI yang belum punya finalScore (belum lengkap).
 */
export function weightedFinalScore(items: ScoredKpi[]): number | null {
  if (items.length === 0) return null
  let sum = 0
  for (const it of items) {
    if (it.finalScore == null) return null
    sum += (it.weight / 100) * it.finalScore
  }
  return Math.round(sum * 100) / 100
}

export interface ManagerScoreRow {
  employeeName: string | null
  managerScore: number | null
}

/** KPI yang belum dinilai manajer — menghalangi penguncian periode. */
export function lockProblems(rows: ManagerScoreRow[]): string[] {
  const missing = rows.filter((r) => r.managerScore == null)
  if (missing.length === 0) return []
  const names = [...new Set(missing.map((r) => r.employeeName ?? "Karyawan"))]
  return [`Masih ada ${missing.length} KPI belum dinilai manajer (${names.join(", ")})`]
}
