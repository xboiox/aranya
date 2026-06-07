import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getEmployeeIdByUser } from "@/modules/attendance/queries"
import { listMyOvertime } from "@/modules/overtime/queries"
import { OVERTIME_STATUS_LABEL, OVERTIME_STATUS_STYLE } from "@/modules/overtime/schema"
import { formatMinutes } from "@/lib/time"
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
        <div className="overflow-hidden rounded-xl border">
          <table className="min-w-full divide-y">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Tanggal</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Jam</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Durasi</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Status</th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase text-muted-foreground">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Belum ada pengajuan lembur.
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2 text-sm">{dateLabel(r.date)}</td>
                    <td className="px-4 py-2 text-sm">{r.startTime}–{r.endTime}</td>
                    <td className="px-4 py-2 text-sm">{formatMinutes(r.durationMinutes)}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${OVERTIME_STATUS_STYLE[r.status]}`}>
                        {OVERTIME_STATUS_LABEL[r.status]}
                      </span>
                      {r.status === "rejected" && r.rejectionReason && (
                        <p className="mt-1 text-xs text-muted-foreground">{r.rejectionReason}</p>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {r.status === "pending" && <CancelOvertimeButton id={r.id} />}
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
