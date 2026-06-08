import { redirect } from "next/navigation"
import { auth, hasRole } from "@/lib/auth"
import {
  listTeamAttendanceRange,
  listDepartments,
} from "@/modules/attendance/queries"
import {
  filterTeamRows,
  isTeamStatus,
  type TeamStatus,
} from "@/modules/attendance/team-report"
import { todayJakarta, toYMD, parseDateOnly } from "@/lib/date"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import AttendanceCorrectionRow from "./_row"

const STATUS_OPTIONS: { value: TeamStatus; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "present", label: "Hadir" },
  { value: "absent", label: "Alpha" },
  { value: "late", label: "Terlambat" },
]

function toHHMM(d: Date | null): string {
  if (!d) return ""
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(d))
}

function dateDisplay(d: Date): string {
  return new Date(d).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
    day: "2-digit",
    month: "short",
  })
}

const inputClass =
  "mt-1 block rounded-md border border-input bg-background px-3 py-2 text-sm"

interface Props {
  searchParams: Promise<{
    startDate?: string
    endDate?: string
    q?: string
    status?: string
    department?: string
  }>
}

export default async function TeamAttendancePage({ searchParams }: Props) {
  const session = await auth()
  if (!session) redirect("/login")
  if (!hasRole(session.user.roles, "hr_admin") || !session.user.tenantId) {
    redirect("/dashboard")
  }
  const tenantId = session.user.tenantId

  const sp = await searchParams
  const todayStr = toYMD(todayJakarta())
  const startStr = sp.startDate ?? todayStr
  const endStr = sp.endDate ?? startStr
  let startDate = parseDateOnly(startStr) ?? todayJakarta()
  let endDate = parseDateOnly(endStr) ?? startDate
  if (startDate > endDate) [startDate, endDate] = [endDate, startDate]

  const status: TeamStatus = isTeamStatus(sp.status) ? sp.status : "all"
  const q = sp.q
  const department = sp.department || undefined

  const [departments, allRows] = await Promise.all([
    listDepartments(tenantId),
    listTeamAttendanceRange(tenantId, { startDate, endDate, department }),
  ])
  const rows = filterTeamRows(allRows, { q, status })
  const present = rows.filter((r) => r.checkInAt).length
  const isFiltered = Boolean(q) || status !== "all" || Boolean(department)

  const exportParams = new URLSearchParams({
    startDate: toYMD(startDate),
    endDate: toYMD(endDate),
    status,
  })
  if (q) exportParams.set("q", q)
  if (department) exportParams.set("department", department)
  const exportHref = `/api/attendance/team/export?${exportParams.toString()}`

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Absensi Tim</h1>
        <p className="text-sm text-muted-foreground">
          {present} dari {rows.length} baris hadir
          {isFiltered && ` (terfilter dari ${allRows.length})`}. Koreksi jam jika ada kesalahan.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="startDate" className="text-xs text-muted-foreground">Dari</label>
          <input id="startDate" name="startDate" type="date" defaultValue={toYMD(startDate)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="endDate" className="text-xs text-muted-foreground">Sampai</label>
          <input id="endDate" name="endDate" type="date" defaultValue={toYMD(endDate)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="department" className="text-xs text-muted-foreground">Departemen</label>
          <select id="department" name="department" defaultValue={department ?? ""} className={inputClass}>
            <option value="">Semua</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="status" className="text-xs text-muted-foreground">Status</label>
          <select id="status" name="status" defaultValue={status} className={inputClass}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="min-w-40 flex-1">
          <label htmlFor="q" className="text-xs text-muted-foreground">Cari nama</label>
          <input id="q" name="q" type="search" defaultValue={q ?? ""} placeholder="Nama karyawan…" className={`${inputClass} w-full`} />
        </div>
        <Button type="submit" variant="outline" size="sm">Terapkan</Button>
        <Button variant="outline" size="sm" render={<a href={exportHref} />}>
          <Download className="size-4" />
          Export CSV
        </Button>
      </form>

      <div className="overflow-hidden rounded-xl border">
        <table className="min-w-full divide-y">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Tanggal</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Karyawan</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Departemen</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Masuk</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Keluar</th>
              <th className="px-4 py-2 text-right text-xs font-medium uppercase text-muted-foreground">Koreksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Tidak ada data untuk filter ini.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <AttendanceCorrectionRow
                  key={`${r.employeeId}-${toYMD(r.date)}`}
                  employeeId={r.employeeId}
                  name={r.name}
                  department={r.department}
                  dateStr={toYMD(r.date)}
                  dateDisplay={dateDisplay(r.date)}
                  initialCheckIn={toHHMM(r.checkInAt)}
                  initialCheckOut={toHHMM(r.checkOutAt)}
                  isLate={r.isLate}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
