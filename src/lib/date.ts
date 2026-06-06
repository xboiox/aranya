/** Format Date → "YYYY-MM-DD" (berbasis UTC). */
export function toYMD(d: Date): string {
  return new Date(d).toISOString().slice(0, 10)
}

/**
 * Hitung jumlah hari kerja (Senin–Jumat) inklusif antara dua tanggal,
 * mengecualikan akhir pekan DAN hari libur (set "YYYY-MM-DD").
 * Pakai UTC agar bebas drift zona waktu.
 */
export function countWorkingDays(
  start: Date,
  end: Date,
  holidays: Set<string> = new Set(),
): number {
  const cur = new Date(start)
  cur.setUTCHours(0, 0, 0, 0)
  const last = new Date(end)
  last.setUTCHours(0, 0, 0, 0)
  if (last < cur) return 0

  let count = 0
  while (cur <= last) {
    const day = cur.getUTCDay() // 0 = Minggu, 6 = Sabtu
    const ymd = cur.toISOString().slice(0, 10)
    if (day !== 0 && day !== 6 && !holidays.has(ymd)) count++
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return count
}

/** True jika dua rentang tanggal (inklusif) saling tumpang tindih. */
export function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart <= bEnd && aEnd >= bStart
}

export function parseDateOnly(s: string): Date | null {
  const d = new Date(`${s}T00:00:00.000Z`)
  return isNaN(d.getTime()) ? null : d
}

/** Tanggal hari ini di zona Asia/Jakarta sebagai Date (tengah malam UTC). */
export function todayJakarta(): Date {
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
  return new Date(`${s}T00:00:00.000Z`)
}
