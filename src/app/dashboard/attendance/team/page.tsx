import { redirect } from "next/navigation"
import { auth, hasRole } from "@/lib/auth"
import { listTeamAttendance } from "@/modules/attendance/queries"
import { todayJakarta, toYMD, parseDateOnly } from "@/lib/date"
import { Button } from "@/components/ui/button"
import AttendanceCorrectionRow from "./_row"

function toHHMM(d: Date | null): string {
  if (!d) return ""
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(d))
}

interface Props {
  searchParams: Promise<{ date?: string }>
}

export default async function TeamAttendancePage({ searchParams }: Props) {
  const session = await auth()
  if (!session) redirect("/login")
  if (!hasRole(session.user.roles, "hr_admin") || !session.user.tenantId) {
    redirect("/dashboard")
  }

  const { date: dateParam } = await searchParams
  const dateStr = dateParam ?? toYMD(todayJakarta())
  const date = parseDateOnly(dateStr) ?? todayJakarta()
  const rows = await listTeamAttendance(session.user.tenantId, date)

  const present = rows.filter((r) => r.checkInAt).length

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Absensi Tim</h1>
        <p className="text-sm text-muted-foreground">
          {present} dari {rows.length} karyawan hadir. Koreksi jam jika ada kesalahan.
        </p>
      </div>

      <form className="flex items-end gap-2">
        <div>
          <label htmlFor="date" className="text-xs text-muted-foreground">Tanggal</label>
          <input
            id="date"
            name="date"
            type="date"
            defaultValue={dateStr}
            className="mt-1 block rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <Button type="submit" variant="outline" size="sm">Lihat</Button>
      </form>

      <div className="overflow-hidden rounded-xl border">
        <table className="min-w-full divide-y">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Karyawan</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Masuk</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Keluar</th>
              <th className="px-4 py-2 text-right text-xs font-medium uppercase text-muted-foreground">Koreksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Belum ada karyawan.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <AttendanceCorrectionRow
                  key={r.employeeId}
                  employeeId={r.employeeId}
                  name={r.name}
                  dateStr={dateStr}
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
