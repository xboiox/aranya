import { z } from "zod"

export const submitKpiSchema = z.object({
  period: z
    .string()
    .regex(/^\d{4}-Q[1-4]$/, "Format periode harus YYYY-Qn (mis. 2026-Q1)"),
  score: z.coerce
    .number({ invalid_type_error: "Nilai harus berupa angka" })
    .int("Nilai harus bilangan bulat")
    .min(0, "Nilai minimum 0")
    .max(100, "Nilai maksimum 100"),
  notes: z.string().trim().max(1000).optional().nullish(),
})

export type SubmitKpiInput = z.infer<typeof submitKpiSchema>

export type KpiStatus = "pending" | "approved" | "rejected"

export const KPI_STATUS_LABEL: Record<KpiStatus, string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
}

export const KPI_STATUS_STYLE: Record<KpiStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
}

// Empat kuartal terakhir termasuk kuartal berjalan, untuk dropdown periode.
export function recentQuarters(now: Date = new Date()): string[] {
  const result: string[] = []
  let year = now.getUTCFullYear()
  let q = Math.floor(now.getUTCMonth() / 3) + 1
  for (let i = 0; i < 4; i++) {
    result.push(`${year}-Q${q}`)
    q -= 1
    if (q < 1) {
      q = 4
      year -= 1
    }
  }
  return result
}
