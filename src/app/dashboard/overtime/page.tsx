import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getEmployeeIdByUser } from "@/modules/attendance/queries"
import { listMyOvertime } from "@/modules/overtime/queries"
import { OVERTIME_STATUS_LABEL } from "@/modules/overtime/schema"
import { formatMinutes } from "@/lib/time"
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
import OvertimeRequestForm from "./_form"
import CancelOvertimeButton from "./_cancel"

function dateLabel(d: Date): string {
  return new Date(d).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export default async function OvertimePage() {
  const session = await auth()
  if (!session) redirect("/login")
  const tenantId = session.user.tenantId
  if (!tenantId) {
    return <p className="text-sm text-muted-foreground">Akun tidak terhubung ke perusahaan.</p>
  }

  const employeeId = await getEmployeeIdByUser(tenantId, session.user.id)
  if (!employeeId) {
    return <p className="text-sm text-muted-foreground">Fitur lembur hanya untuk akun karyawan.</p>
  }

  const requests = await listMyOvertime(tenantId, employeeId)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Lembur</h1>

      <OvertimeRequestForm />

      <div>
        <h2 className="mb-2 text-sm font-semibold">Riwayat Pengajuan</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Jam</TableHead>
              <TableHead>Durasi</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableEmpty colSpan={5}>Belum ada pengajuan lembur.</TableEmpty>
            ) : (
              requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{dateLabel(r.date)}</TableCell>
                  <TableCell>{r.startTime}–{r.endTime}</TableCell>
                  <TableCell>{formatMinutes(r.durationMinutes)}</TableCell>
                  <TableCell>
                    <Badge variant={requestStatusVariant(r.status)}>
                      {OVERTIME_STATUS_LABEL[r.status]}
                    </Badge>
                    {r.status === "rejected" && r.rejectionReason && (
                      <p className="mt-1 text-xs text-muted-foreground">{r.rejectionReason}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === "pending" && <CancelOvertimeButton id={r.id} />}
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
