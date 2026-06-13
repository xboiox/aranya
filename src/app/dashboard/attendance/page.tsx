import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import {
  getEmployeeIdByUser,
  getTodayAttendance,
  listRecentAttendance,
  getGeofenceConfig,
} from "@/modules/attendance/queries"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Masuk</TableHead>
              <TableHead>Keluar</TableHead>
              <TableHead>Ket.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recent.length === 0 ? (
              <TableEmpty colSpan={4}>Belum ada riwayat absensi.</TableEmpty>
            ) : (
              recent.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{dateLabel(r.date)}</TableCell>
                  <TableCell>{timeLabel(r.checkInAt)}</TableCell>
                  <TableCell>{timeLabel(r.checkOutAt)}</TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">{r.checkInWfh ? "WFH" : "WFO"}</span>
                    {r.isLate && (
                      <Badge variant="destructive" className="ml-1.5">Terlambat</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
