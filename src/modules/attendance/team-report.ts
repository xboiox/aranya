import type { TeamAttendanceRow } from "./queries"

export type TeamStatus = "all" | "present" | "absent" | "late"

export function isTeamStatus(v: unknown): v is TeamStatus {
  return v === "all" || v === "present" || v === "absent" || v === "late"
}

/** Status kehadiran turunan dari satu baris. */
export function attendanceStatus(row: TeamAttendanceRow): "present" | "absent" | "late" {
  if (!row.checkInAt) return "absent"
  if (row.isLate) return "late"
  return "present"
}

const STATUS_TEXT: Record<"present" | "absent" | "late", string> = {
  present: "Hadir",
  absent: "Alpha",
  late: "Terlambat",
}

export function statusText(row: TeamAttendanceRow): string {
  return STATUS_TEXT[attendanceStatus(row)]
}

export interface TeamFilter {
  q?: string
  status?: TeamStatus
}

/** Filter berdasarkan nama (case-insensitive) dan status kehadiran. */
export function filterTeamRows(
  rows: TeamAttendanceRow[],
  { q, status = "all" }: TeamFilter,
): TeamAttendanceRow[] {
  const needle = q?.trim().toLowerCase() ?? ""
  return rows.filter((r) => {
    if (needle && !(r.name ?? "").toLowerCase().includes(needle)) return false
    if (status === "all") return true
    if (status === "present") return r.checkInAt != null
    if (status === "absent") return r.checkInAt == null
    return r.isLate === true // "late"
  })
}

function hhmm(d: Date | null): string {
  if (!d) return ""
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(d))
}

/** Membungkus sel CSV bila mengandung koma/kutip/baris baru (RFC 4180). */
export function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/** Membangun konten CSV absensi tim untuk satu tanggal. */
export function teamRowsToCsv(rows: TeamAttendanceRow[], dateStr: string): string {
  const header = ["Tanggal", "Nama", "Masuk", "Keluar", "Status"]
  const lines = rows.map((r) =>
    [dateStr, r.name ?? "", hhmm(r.checkInAt), hhmm(r.checkOutAt), statusText(r)]
      .map((c) => csvCell(c))
      .join(","),
  )
  return [header.join(","), ...lines].join("\r\n")
}
