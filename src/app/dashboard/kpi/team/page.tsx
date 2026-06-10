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
  progressForKpis,
  feedbackForKpis,
  appraisalsForKpis,
  type TeamKpiItem,
} from "@/modules/kpi/queries"
import { weightedFinalScore } from "@/modules/kpi/validation"
import {
  PERIOD_STATUS_LABEL,
  PERIOD_STATUS_STYLE,
  KPI_STATUS_LABEL,
  KPI_STATUS_STYLE,
  KPI_RED_THRESHOLD,
  type PeriodStatus,
  type KpiStatus,
} from "@/modules/kpi/schema"
import KpiCreateForm from "./_create-form"
import KpiRow from "./_kpi-row"
import KpiMonitorRow from "./_monitor-row"
import KpiScoreRow from "./_score-row"

function dt(d: Date): string {
  return new Date(d).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "short",
  })
}

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
  const isActive = period.status === "active"
  const isAppraisal = period.status === "appraisal"
  const isLocked = period.status === "locked"
  const isScoring = isAppraisal || isLocked
  const [teamKpis, assignable] = await Promise.all([
    listTeamKpis(tenantId, period.id, myEmployeeId, isHr),
    isPlanning ? listAssignableEmployees(tenantId, myEmployeeId, isHr) : Promise.resolve([]),
  ])

  // Monitoring (Fase B) saat periode berjalan.
  const kpiIds = teamKpis.map((k) => k.id)
  const [progressRows, feedbackRows] = isActive
    ? await Promise.all([progressForKpis(tenantId, kpiIds), feedbackForKpis(tenantId, kpiIds)])
    : [[], []]
  const latestByKpi = new Map<string, number>()
  const progressByKpi = new Map<string, typeof progressRows>()
  for (const p of progressRows) {
    const arr = progressByKpi.get(p.kpiId) ?? []
    arr.push(p)
    progressByKpi.set(p.kpiId, arr)
    if (!latestByKpi.has(p.kpiId)) latestByKpi.set(p.kpiId, p.percent) // desc → pertama = terbaru
  }
  const feedbackByKpi = new Map<string, typeof feedbackRows>()
  for (const f of feedbackRows) {
    const arr = feedbackByKpi.get(f.kpiId) ?? []
    arr.push(f)
    feedbackByKpi.set(f.kpiId, arr)
  }
  const updatedCount = isActive ? teamKpis.filter((k) => progressByKpi.has(k.id)).length : 0

  // Penilaian (Fase C): muat appraisal saat appraisal/locked.
  const appraisalRows = isScoring ? await appraisalsForKpis(tenantId, kpiIds) : []
  const apprByKpi = new Map(appraisalRows.map((a) => [a.kpiId, a]))

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

      {isActive && (
        <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          Periode berjalan — pantau progres & beri feedback. {updatedCount}/{teamKpis.length} KPI sudah diupdate.
        </p>
      )}
      {isAppraisal && (
        <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          Tahap penilaian — beri nilai (1–5) tiap KPI bawahan. Skor akhir default = nilai manajer.
        </p>
      )}
      {isLocked && (
        <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          Periode terkunci{isHr ? " — Anda dapat mengkalibrasi skor akhir." : " — penilaian final."}
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
              {isScoring ? (
                (() => {
                  const score = weightedFinalScore(
                    g.items.map((k) => ({ weight: k.weight, finalScore: apprByKpi.get(k.id)?.finalScore ?? null })),
                  )
                  return (
                    <span className="text-sm font-medium">
                      {score != null ? `Skor akhir ${score.toFixed(2)} / 5` : "Skor belum lengkap"}
                    </span>
                  )
                })()
              ) : (
                <span className={`text-sm ${g.total === 100 ? "text-emerald-600" : "text-amber-600"}`}>
                  Total bobot {g.total}%{g.total !== 100 && " (harus 100%)"}
                </span>
              )}
            </div>
            <ul className="divide-y">
              {g.items.map((k) =>
                isScoring ? (
                  <KpiScoreRow
                    key={k.id}
                    id={k.id}
                    title={k.title}
                    weight={k.weight}
                    selfScore={apprByKpi.get(k.id)?.selfScore ?? null}
                    selfNote={apprByKpi.get(k.id)?.selfNote ?? null}
                    managerScore={apprByKpi.get(k.id)?.managerScore ?? null}
                    managerNote={apprByKpi.get(k.id)?.managerNote ?? null}
                    finalScore={apprByKpi.get(k.id)?.finalScore ?? null}
                    mode={isLocked ? "locked" : "appraisal"}
                    canCalibrate={isHr}
                  />
                ) : isActive ? (
                  <KpiMonitorRow
                    key={k.id}
                    id={k.id}
                    title={k.title}
                    weight={k.weight}
                    target={k.target}
                    latestPercent={latestByKpi.get(k.id) ?? 0}
                    isRed={(latestByKpi.get(k.id) ?? 0) < KPI_RED_THRESHOLD}
                    progress={(progressByKpi.get(k.id) ?? []).map((p) => ({
                      id: p.id,
                      percent: p.percent,
                      note: p.note,
                      evidenceName: p.evidenceName,
                      hasEvidence: p.hasEvidence,
                      date: dt(p.createdAt),
                    }))}
                    feedback={(feedbackByKpi.get(k.id) ?? []).map((f) => ({
                      id: f.id,
                      fromName: f.fromName,
                      message: f.message,
                      date: dt(f.createdAt),
                    }))}
                  />
                ) : (
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
                ),
              )}
            </ul>
          </div>
        ))
      )}
    </div>
  )
}
