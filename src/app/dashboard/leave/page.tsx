import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getEmployeeIdByUser } from "@/modules/attendance/queries"
import { listMyLeaveRequests, getLeaveBalance } from "@/modules/leave/queries"
import { leaveTypeLabel } from "@/modules/leave/schema"
import { todayJakarta } from "@/lib/date"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { requestStatusVariant } from "@/lib/status"
import LeaveRequestForm from "./_form"
import CancelLeaveButton from "./_cancel"

function dateLabel(d: Date): string {
  return new Date(d).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
  cancelled: "Dibatalkan",
}

export default async function LeavePage() {
  const session = await auth()
  if (!session) redirect("/login")
  const tenantId = session.user.tenantId
  if (!tenantId) {
    return <p className="text-sm text-muted-foreground">Akun tidak terhubung ke perusahaan.</p>
  }

  const employeeId = await getEmployeeIdByUser(tenantId, session.user.id)
  if (!employeeId) {
    return <p className="text-sm text-muted-foreground">Fitur cuti hanya untuk akun karyawan.</p>
  }

  const [requests, balance] = await Promise.all([
    listMyLeaveRequests(tenantId, employeeId),
    getLeaveBalance(tenantId, employeeId),
  ])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Cuti</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Kuota Tahunan</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{balance.quota} hari</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Terpakai</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{balance.used} hari</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Sisa</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-primary">{balance.remaining} hari</CardContent>
        </Card>
      </div>

      <LeaveRequestForm />

      <div>
        <h2 className="mb-2 text-sm font-semibold">Riwayat Pengajuan</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Jenis</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Hari</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableEmpty colSpan={5}>Belum ada pengajuan cuti.</TableEmpty>
            ) : (
              requests.map((r) => {
                const cancellable =
                  r.status === "pending" ||
                  (r.status === "approved" && new Date(r.startDate) > todayJakarta())
                return (
                  <TableRow key={r.id}>
                    <TableCell>{leaveTypeLabel(r.type)}</TableCell>
                    <TableCell>
                      {dateLabel(r.startDate)} – {dateLabel(r.endDate)}
                    </TableCell>
                    <TableCell>{r.totalDays}</TableCell>
                    <TableCell>
                      <Badge variant={requestStatusVariant(r.status)}>
                        {STATUS_LABEL[r.status]}
                      </Badge>
                      {r.status === "rejected" && r.rejectionReason && (
                        <p className="mt-1 text-xs text-muted-foreground">{r.rejectionReason}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {cancellable && <CancelLeaveButton id={r.id} />}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
