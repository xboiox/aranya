export const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
] as const

export function monthLabel(month: number): string {
  return MONTH_NAMES[month - 1] ?? String(month)
}
