/** Parse "HH:MM" → menit sejak tengah malam, atau null jika tidak valid. */
export function parseTimeToMinutes(t: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(t)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

/**
 * Durasi (menit) antara dua jam "HH:MM".
 * Jika jam selesai <= jam mulai → dianggap lewat tengah malam (lembur malam).
 * Mengembalikan null jika format tidak valid atau durasi 0.
 */
export function computeDurationMinutes(start: string, end: string): number | null {
  const s = parseTimeToMinutes(start)
  const e = parseTimeToMinutes(end)
  if (s == null || e == null) return null
  let dur = e - s
  if (dur === 0) return null
  if (dur < 0) dur += 24 * 60
  return dur
}

/** Format menit → "Hj Mm" (mis. 150 → "2j 30m"). */
export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}j`
  return `${h}j ${m}m`
}
