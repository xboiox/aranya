import Link from "next/link"
import { redirect } from "next/navigation"
import { auth, hasAnyRole, hasRole } from "@/lib/auth"
import { isModuleActive } from "@/lib/modules"
import { ModuleLocked } from "@/components/module-locked"
import { getEmployeeIdByUser } from "@/modules/attendance/queries"
import { listPeriods, getPeriod, listTeamScorecards } from "@/modules/kpi/queries"
import {
  PERIOD_STATUS_LABEL,
  PERIOD_STATUS_STYLE,
  SCORECARD_STATUS_LABEL,
  SCORECARD_STATUS_STYLE,
  type PeriodStatus,
  type ScorecardStatus,
} from "@/modules/kpi/schema"
import CreateScorecardButton from "./_create-scorecard"

const selectClass = "rounded-md border border-input bg-background px-3 py-2 text-sm"

interface Props {
  searchParams: Promise<{ periodId?: string }>
}

export default async function TeamKpiPage({ searchParams }: Props) {
  const session = await auth()
  if (!session) redirect("/login")
  const tenantId = session.user.tenantId
  if (!tenantId || !hasAnyRole(session.user.roles, "manager", "hr_admin")) redirect("/dashboard")
  if (!(await isModuleActive(tenantId, "MODULE_2"))) return <ModuleLocked moduleCode="MODULE_2" />

  const isHr = hasRole(session.user.roles, "hr_admin")
  const myEmployeeId = (await getEmployeeIdByUser(tenantId, session.user.id)) ?? ""
  const periods = await listPeriods(tenantId)
  const { periodId } = await searchParams
  const period = periodId ? await getPeriod(tenantId, periodId) : periods[0] ?? null

  if (!period) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-2xl font-bold">KPI Tim</h1>
        <p className="rounded-xl border px-4 py-8 text-center text-sm text-muted-foreground">Belum ada periode KPI. Hubungi HR.</p>
      </div>
    )
  }

  const rows = await listTeamScorecards(tenantId, period.id, myEmployeeId, isHr)
  const isPlanning = period.status === "planning"

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">KPI Tim</h1>
        <p className="text-sm text-muted-foreground">Susun & nilai scorecard KPI bawahan (Epic → Task).</p>
      </div>

      <form method="get" className="flex flex-wrap items-center gap-2">
        <label htmlFor="periodId" className="text-sm text-muted-foreground">Periode</label>
        <select id="periodId" name="periodId" defaultValue={period.id} className={selectClass}>
          {periods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button type="submit" className="rounded-md border px-3 py-2 text-sm hover:bg-muted">Lihat</button>
        <span className={`ml-auto inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PERIOD_STATUS_STYLE[period.status as PeriodStatus]}`}>
          {PERIOD_STATUS_LABEL[period.status as PeriodStatus]}
        </span>
      </form>

      <div className="overflow-hidden rounded-xl border">
        <table className="min-w-full divide-y">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Karyawan</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Scorecard</th>
              <th className="px-4 py-2 text-right text-xs font-medium uppercase text-muted-foreground">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">Tidak ada bawahan.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.employeeId}>
                  <td className="px-4 py-2 text-sm">{r.employeeName ?? "—"}</td>
                  <td className="px-4 py-2">
                    {r.status ? (
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${SCORECARD_STATUS_STYLE[r.status as ScorecardStatus]}`}>
                        {SCORECARD_STATUS_LABEL[r.status as ScorecardStatus]}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Belum ada</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {r.scorecardId ? (
                      <Link href={`/dashboard/kpi/team/${r.scorecardId}`} className="text-sm text-primary hover:underline">Kelola →</Link>
                    ) : isPlanning ? (
                      <CreateScorecardButton periodId={period.id} employeeId={r.employeeId} />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
