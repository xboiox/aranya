import { redirect } from "next/navigation"
import { auth, hasAnyRole, hasRole } from "@/lib/auth"
import { isModuleActive } from "@/lib/modules"
import { ModuleLocked } from "@/components/module-locked"
import { getEmployeeIdByUser } from "@/modules/attendance/queries"
import { listPendingKpiApprovals } from "@/modules/kpi/queries"
import KpiApprovalInbox from "./_inbox"

export default async function KpiApprovalsPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const tenantId = session.user.tenantId
  if (!tenantId || !hasAnyRole(session.user.roles, "manager", "hr_admin")) {
    redirect("/dashboard")
  }
  if (!(await isModuleActive(tenantId, "MODULE_2"))) {
    return <ModuleLocked moduleCode="MODULE_2" />
  }

  const employeeId = (await getEmployeeIdByUser(tenantId, session.user.id)) ?? ""
  const isHr = hasRole(session.user.roles, "hr_admin")
  const pending = await listPendingKpiApprovals(tenantId, employeeId, isHr)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Persetujuan KPI</h1>
        <p className="text-sm text-muted-foreground">
          {pending.length} penilaian menunggu persetujuan
        </p>
      </div>

      <KpiApprovalInbox
        items={pending.map((p) => ({
          id: p.id,
          requesterName: p.requesterName ?? "—",
          period: p.period,
          score: p.score,
          notes: p.notes,
        }))}
      />
    </div>
  )
}
