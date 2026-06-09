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
