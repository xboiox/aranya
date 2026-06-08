import { toYMD } from "@/lib/date"
import { buildCsv } from "@/lib/csv"
import type { TeamAttendanceRow } from "./queries"

export type TeamStatus = "all" | "present" | "absent" | "late"

const MAX_RANGE_DAYS = 92

export interface GridEmployee {
  employeeId: string
  name: string | null
  department: string | null
}

export interface GridAttendance {
  employeeId: string
  date: Date
  checkInAt: Date | null
  checkOutAt: Date | null
  isLate: boolean | null
}

/** Daftar tanggal (UTC midnight) dari start s.d. end inklusif, dibatasi MAX_RANGE_DAYS. */
export function eachDateInRange(start: Date, end: Date): Date[] {
  const dates: Date[] = []
  const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()))
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()))
  while (cur <= last && dates.length < MAX_RANGE_DAYS) {
    dates.push(new Date(cur))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return dates
}

/**
 * Membangun grid (karyawan × tanggal): satu baris per karyawan per tanggal,
 * mencocokkan record absensi bila ada. Urut tanggal lalu nama.
 */
export function buildTeamGrid(
  employees: GridEmployee[],
  attendance: GridAttendance[],
  dates: Date[],
): TeamAttendanceRow[] {
  const byKey = new Map<string, GridAttendance>()
  for (const a of attendance) {
    byKey.set(`${a.employeeId}|${toYMD(a.date)}`, a)
  }

  const rows: TeamAttendanceRow[] = []
  for (const date of dates) {
    const ymd = toYMD(date)
    for (const emp of employees) {
      const a = byKey.get(`${emp.employeeId}|${ymd}`)
      rows.push({
        employeeId: emp.employeeId,
        name: emp.name,
        department: emp.department,
        date,
        checkInAt: a?.checkInAt ?? null,
        checkOutAt: a?.checkOutAt ?? null,
        isLate: a?.isLate ?? null,
      })
    }
  }
  return rows
}

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

/** Membangun konten CSV absensi tim (satu baris per karyawan per tanggal). */
export function teamRowsToCsv(rows: TeamAttendanceRow[]): string {
  return buildCsv(
    ["Tanggal", "Nama", "Departemen", "Masuk", "Keluar", "Status"],
    rows.map((r) => [
      toYMD(r.date),
      r.name ?? "",
      r.department ?? "",
      hhmm(r.checkInAt),
      hhmm(r.checkOutAt),
      statusText(r),
    ]),
  )
}
