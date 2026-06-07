export interface Breakdown {
  label: string
  count: number
}

export const GENDER_LABEL: Record<string, string> = {
  male: "Laki-laki",
  female: "Perempuan",
}

export const UNSET_LABEL = "Tidak diset"

export function toBreakdown(
  rows: { key: string | null; value: number }[],
  labelMap?: Record<string, string>,
): Breakdown[] {
  return rows
    .map((r) => ({
      label: r.key ? (labelMap?.[r.key] ?? r.key) : UNSET_LABEL,
      count: Number(r.value),
    }))
    .sort((a, b) => b.count - a.count)
}
