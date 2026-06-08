import { redirect } from "next/navigation"
import { auth, hasAnyRole, hasRole } from "@/lib/auth"
import { getEmployeeIdByUser } from "@/modules/attendance/queries"
import {
  listPendingOvertimeApprovals,
  listDecidedOvertimeApprovals,
} from "@/modules/overtime/queries"
import { formatMinutes } from "@/lib/time"
import { ApprovalHistory } from "@/components/approval-history"
import OvertimeApprovalInbox from "./_inbox"

function dateLabel(d: Date): string {
  return new Date(d).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
  })
}

function decidedLabel(d: Date | null): string | null {
  if (!d) return null
  return new Date(d).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export default async function OvertimeApprovalsPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const tenantId = session.user.tenantId
  if (!tenantId || !hasAnyRole(session.user.roles, "manager", "hr_admin")) {
    redirect("/dashboard")
  }

  const employeeId = (await getEmployeeIdByUser(tenantId, session.user.id)) ?? ""
  const isHr = hasRole(session.user.roles, "hr_admin")
  const [pending, decided] = await Promise.all([
    listPendingOvertimeApprovals(tenantId, employeeId, isHr),
    listDecidedOvertimeApprovals(tenantId, employeeId, isHr),
  ])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Persetujuan Lembur</h1>
        <p className="text-sm text-muted-foreground">
          {pending.length} pengajuan menunggu persetujuan
        </p>
      </div>

      <OvertimeApprovalInbox
        items={pending.map((p) => ({
          id: p.id,
          requesterName: p.requesterName ?? "—",
          date: dateLabel(p.date),
          time: `${p.startTime}–${p.endTime}`,
          duration: formatMinutes(p.durationMinutes),
          reason: p.reason,
        }))}
      />

      <ApprovalHistory
        items={decided.map((d) => ({
          id: d.id,
          requesterName: d.requesterName ?? "—",
          detail: `${dateLabel(d.date)} · ${d.startTime}–${d.endTime} · ${formatMinutes(d.durationMinutes)}`,
          status: d.status,
          decidedAt: decidedLabel(d.decidedAt),
          decidedBy: d.approverName,
          rejectionReason: d.rejectionReason,
        }))}
      />
    </div>
  )
}
