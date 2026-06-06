import { redirect } from "next/navigation"
import { auth, hasAnyRole, hasRole } from "@/lib/auth"
import { getEmployeeIdByUser } from "@/modules/attendance/queries"
import { listPendingApprovals } from "@/modules/leave/queries"
import { leaveTypeLabel } from "@/modules/leave/schema"
import ApprovalInbox from "./_inbox"

function dateLabel(d: Date): string {
  return new Date(d).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
  })
}

export default async function ApprovalsPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const tenantId = session.user.tenantId
  if (!tenantId || !hasAnyRole(session.user.roles, "manager", "hr_admin")) {
    redirect("/dashboard")
  }

  const employeeId = (await getEmployeeIdByUser(tenantId, session.user.id)) ?? ""
  const isHr = hasRole(session.user.roles, "hr_admin")
  const pending = await listPendingApprovals(tenantId, employeeId, isHr)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Persetujuan Cuti</h1>
        <p className="text-sm text-muted-foreground">
          {pending.length} pengajuan menunggu persetujuan
        </p>
      </div>

      <ApprovalInbox
        items={pending.map((p) => ({
          id: p.id,
          requesterName: p.requesterName ?? "—",
          type: leaveTypeLabel(p.type),
          range: `${dateLabel(p.startDate)} – ${dateLabel(p.endDate)}`,
          totalDays: p.totalDays,
          reason: p.reason,
        }))}
      />
    </div>
  )
}
