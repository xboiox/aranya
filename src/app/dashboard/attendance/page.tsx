import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import {
  getEmployeeIdByUser,
  getTodayAttendance,
  listRecentAttendance,
  getGeofenceConfig,
} from "@/modules/attendance/queries"
import CheckInWidget from "./_checkin"

function timeLabel(d: Date | null): string {
  if (!d) return "—"
  return new Date(d).toLocaleTimeString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function dateLabel(d: Date): string {
  return new Date(d).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
    day: "2-digit",
    month: "short",
  })
}

export default async function AttendancePage() {
  const session = await auth()
  if (!session) redirect("/login")
  const tenantId = session.user.tenantId

  if (!tenantId) {
    return <p className="text-sm text-muted-foreground">Akun tidak terhubung ke perusahaan.</p>
  }

  const employeeId = await getEmployeeIdByUser(tenantId, session.user.id)
  if (!employeeId) {
    return (
      <p className="text-sm text-muted-foreground">
        Fitur absensi hanya tersedia untuk akun karyawan.
      </p>
    )
  }

  const [today, recent, config] = await Promise.all([
    getTodayAttendance(tenantId, employeeId),
    listRecentAttendance(tenantId, employeeId),
    getGeofenceConfig(tenantId),
  ])

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Absensi</h1>
        <p className="text-sm text-muted-foreground">
          {config.enabled
            ? "Geofencing aktif — pastikan Anda berada di area kantor atau aktifkan WFH."
            : "Geofencing tidak aktif — lokasi tetap dicatat."}
        </p>
      </div>

      <CheckInWidget
        checkedIn={Boolean(today?.checkInAt)}
        checkedOut={Boolean(today?.checkOutAt)}
        checkInLabel={timeLabel(today?.checkInAt ?? null)}
        checkOutLabel={timeLabel(today?.checkOutAt ?? null)}
      />

      <div>
        <h2 className="mb-2 text-sm font-semibold">Riwayat Terakhir</h2>
        <div className="overflow-hidden rounded-xl border">
          <table className="min-w-full divide-y">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Tanggal</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Masuk</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Keluar</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Ket.</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Belum ada riwayat absensi.
                  </td>
                </tr>
              ) : (
                recent.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2 text-sm">{dateLabel(r.date)}</td>
                    <td className="px-4 py-2 text-sm">{timeLabel(r.checkInAt)}</td>
                    <td className="px-4 py-2 text-sm">{timeLabel(r.checkOutAt)}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {r.checkInWfh ? "WFH" : "WFO"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
