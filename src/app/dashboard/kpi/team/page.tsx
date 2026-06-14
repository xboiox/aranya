import Link from "next/link"
import { redirect } from "next/navigation"
import { auth, hasAnyRole, hasRole } from "@/lib/auth"
import { isModuleActive } from "@/lib/modules"
import { ModuleLocked } from "@/components/module-locked"
import { getEmployeeIdByUser } from "@/modules/attendance/queries"
import { listPeriods, getPeriod, listTeamScorecards } from "@/modules/kpi/queries"
import {
  PERIOD_STATUS_LABEL,
  SCORECARD_STATUS_LABEL,
  type PeriodStatus,
  type ScorecardStatus,
} from "@/modules/kpi/schema"
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
import { periodStatusVariant, scorecardStatusVariant } from "@/lib/status"
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
        <button type="submit" className="cursor-pointer rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted">Lihat</button>
        <Badge variant={periodStatusVariant(period.status)} className="ml-auto">
          {PERIOD_STATUS_LABEL[period.status as PeriodStatus]}
        </Badge>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Karyawan</TableHead>
            <TableHead>Scorecard</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableEmpty colSpan={3}>Tidak ada bawahan.</TableEmpty>
          ) : (
            rows.map((r) => (
              <TableRow key={r.employeeId}>
                <TableCell>{r.employeeName ?? "—"}</TableCell>
                <TableCell>
                  {r.status ? (
                    <Badge variant={scorecardStatusVariant(r.status)}>
                      {SCORECARD_STATUS_LABEL[r.status as ScorecardStatus]}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Belum ada</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {r.scorecardId ? (
                    <Link href={`/dashboard/kpi/team/${r.scorecardId}`} className="text-sm text-primary hover:underline">Kelola →</Link>
                  ) : isPlanning ? (
                    <CreateScorecardButton periodId={period.id} employeeId={r.employeeId} />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
