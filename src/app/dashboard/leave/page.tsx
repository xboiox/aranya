import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getEmployeeIdByUser } from "@/modules/attendance/queries"
import { listMyLeaveRequests, getLeaveBalance } from "@/modules/leave/queries"
import { leaveTypeLabel } from "@/modules/leave/schema"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import LeaveRequestForm from "./_form"

function dateLabel(d: Date): string {
  return new Date(d).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
}
const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
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
        <div className="overflow-hidden rounded-xl border">
          <table className="min-w-full divide-y">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Jenis</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Tanggal</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Hari</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Belum ada pengajuan cuti.
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2 text-sm">{leaveTypeLabel(r.type)}</td>
                    <td className="px-4 py-2 text-sm">
                      {dateLabel(r.startDate)} – {dateLabel(r.endDate)}
                    </td>
                    <td className="px-4 py-2 text-sm">{r.totalDays}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status]}`}>
                        {STATUS_LABEL[r.status]}
                      </span>
                      {r.status === "rejected" && r.rejectionReason && (
                        <p className="mt-1 text-xs text-muted-foreground">{r.rejectionReason}</p>
                      )}
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
