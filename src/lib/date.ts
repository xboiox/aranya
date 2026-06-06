/**
 * Hitung jumlah hari kerja (Senin–Jumat) inklusif antara dua tanggal.
 * Akhir pekan (Sabtu/Minggu) dikecualikan. Pakai UTC agar bebas drift zona waktu.
 * Catatan: hari libur nasional belum dikecualikan (refinement berikutnya).
 */
export function countWorkingDays(start: Date, end: Date): number {
  const cur = new Date(start)
  cur.setUTCHours(0, 0, 0, 0)
  const last = new Date(end)
  last.setUTCHours(0, 0, 0, 0)
  if (last < cur) return 0

  let count = 0
  while (cur <= last) {
    const day = cur.getUTCDay() // 0 = Minggu, 6 = Sabtu
    if (day !== 0 && day !== 6) count++
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return count
}

export function parseDateOnly(s: string): Date | null {
  const d = new Date(`${s}T00:00:00.000Z`)
  return isNaN(d.getTime()) ? null : d
}
