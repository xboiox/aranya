import { redirect } from "next/navigation"
import { auth, hasAnyRole, hasRole } from "@/lib/auth"
import { isModuleActive } from "@/lib/modules"
import { ModuleLocked } from "@/components/module-locked"
import { getEmployeeIdByUser } from "@/modules/attendance/queries"
import {
  listPeriods,
  getPeriod,
  listTeamKpis,
  listAssignableEmployees,
  type TeamKpiItem,
} from "@/modules/kpi/queries"
import {
  PERIOD_STATUS_LABEL,
  PERIOD_STATUS_STYLE,
  KPI_STATUS_LABEL,
  KPI_STATUS_STYLE,
  type PeriodStatus,
  type KpiStatus,
} from "@/modules/kpi/schema"
import KpiCreateForm from "./_create-form"
import KpiRow from "./_kpi-row"

interface Props {
  searchParams: Promise<{ periodId?: string }>
}

const selectClass = "rounded-md border border-input bg-background px-3 py-2 text-sm"

export default async function TeamKpiPage({ searchParams }: Props) {
  const session = await auth()
  if (!session) redirect("/login")
  const tenantId = session.user.tenantId
  if (!tenantId || !hasAnyRole(session.user.roles, "manager", "hr_admin")) {
    redirect("/dashboard")
  }
  if (!(await isModuleActive(tenantId, "MODULE_2"))) {
    return <ModuleLocked moduleCode="MODULE_2" />
  }

  const isHr = hasRole(session.user.roles, "hr_admin")
  const myEmployeeId = (await getEmployeeIdByUser(tenantId, session.user.id)) ?? ""
  const periods = await listPeriods(tenantId)

  const { periodId } = await searchParams
  const period = periodId
    ? await getPeriod(tenantId, periodId)
    : periods[0] ?? null

  if (!period) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-2xl font-bold">KPI Tim</h1>
        <p className="rounded-xl border px-4 py-8 text-center text-sm text-muted-foreground">
          Belum ada periode KPI. Hubungi HR untuk membuat periode.
        </p>
      </div>
    )
  }

  const isPlanning = period.status === "planning"
  const [teamKpis, assignable] = await Promise.all([
    listTeamKpis(tenantId, period.id, myEmployeeId, isHr),
    isPlanning ? listAssignableEmployees(tenantId, myEmployeeId, isHr) : Promise.resolve([]),
  ])

  // Kelompokkan per karyawan + total bobot.
  const byEmployee = new Map<string, { name: string | null; items: TeamKpiItem[]; total: number }>()
  for (const k of teamKpis) {
    const g = byEmployee.get(k.employeeId) ?? { name: k.employeeName, items: [], total: 0 }
    g.items.push(k)
    g.total += k.weight
    byEmployee.set(k.employeeId, g)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">KPI Tim</h1>
        <p className="text-sm text-muted-foreground">
          Susun KPI berbobot untuk bawahan, lalu kirim untuk disetujui.
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-center gap-2">
        <label htmlFor="periodId" className="text-sm text-muted-foreground">Periode</label>
        <select id="periodId" name="periodId" defaultValue={period.id} className={selectClass}>
          {periods.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <button type="submit" className="rounded-md border px-3 py-2 text-sm hover:bg-muted">Lihat</button>
        <span className={`ml-auto inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PERIOD_STATUS_STYLE[period.status as PeriodStatus]}`}>
          {PERIOD_STATUS_LABEL[period.status as PeriodStatus]}
        </span>
      </form>

      {!isPlanning && (
        <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          Periode sudah {PERIOD_STATUS_LABEL[period.status as PeriodStatus].toLowerCase()} — KPI terkunci dari perubahan.
        </p>
      )}

      {isPlanning && assignable.length > 0 && (
        <KpiCreateForm periodId={period.id} employees={assignable} />
      )}

      {byEmployee.size === 0 ? (
        <p className="rounded-xl border px-4 py-8 text-center text-sm text-muted-foreground">
          Belum ada KPI pada periode ini.
        </p>
      ) : (
        [...byEmployee.entries()].map(([empId, g]) => (
          <div key={empId} className="rounded-xl border">
            <div className="flex items-center justify-between border-b px-4 py-2">
              <span className="font-medium">{g.name ?? "—"}</span>
              <span className={`text-sm ${g.total === 100 ? "text-emerald-600" : "text-amber-600"}`}>
                Total bobot {g.total}%{g.total !== 100 && " (harus 100%)"}
              </span>
            </div>
            <ul className="divide-y">
              {g.items.map((k) => (
                <KpiRow
                  key={k.id}
                  id={k.id}
                  title={k.title}
                  weight={k.weight}
                  target={k.target}
                  status={k.status}
                  statusLabel={KPI_STATUS_LABEL[k.status as KpiStatus]}
                  statusStyle={KPI_STATUS_STYLE[k.status as KpiStatus]}
                  revisionNote={k.revisionNote}
                  editable={isPlanning}
                />
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  )
}
