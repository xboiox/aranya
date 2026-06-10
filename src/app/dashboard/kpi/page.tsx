import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { isModuleActive } from "@/lib/modules"
import { ModuleLocked } from "@/components/module-locked"
import { getEmployeeIdByUser } from "@/modules/attendance/queries"
import { listMyKpis, progressForKpis, feedbackForKpis } from "@/modules/kpi/queries"
import {
  KPI_STATUS_LABEL,
  KPI_STATUS_STYLE,
  type KpiStatus,
} from "@/modules/kpi/schema"
import KpiAgreement from "./_agreement"
import KpiTracking, { type ProgressItem, type FeedbackItem } from "./_tracking"

function dt(d: Date): string {
  return new Date(d).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export default async function MyKpiPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const tenantId = session.user.tenantId
  if (!tenantId) {
    return <p className="text-sm text-muted-foreground">Akun tidak terhubung ke perusahaan.</p>
  }
  if (!(await isModuleActive(tenantId, "MODULE_2"))) {
    return <ModuleLocked moduleCode="MODULE_2" />
  }

  const employeeId = await getEmployeeIdByUser(tenantId, session.user.id)
  if (!employeeId) {
    return <p className="text-sm text-muted-foreground">Fitur KPI hanya untuk akun karyawan.</p>
  }

  const items = await listMyKpis(tenantId, employeeId)

  // Tracking (Fase B) hanya untuk KPI agreed di periode active.
  const trackedIds = items.filter((k) => k.periodStatus === "active" && k.status === "agreed").map((k) => k.id)
  const [progressRows, feedbackRows] = await Promise.all([
    progressForKpis(tenantId, trackedIds),
    feedbackForKpis(tenantId, trackedIds),
  ])
  const progressByKpi = new Map<string, ProgressItem[]>()
  for (const p of progressRows) {
    const arr = progressByKpi.get(p.kpiId) ?? []
    arr.push({ id: p.id, percent: p.percent, note: p.note, evidenceName: p.evidenceName, hasEvidence: p.hasEvidence, date: dt(p.createdAt) })
    progressByKpi.set(p.kpiId, arr)
  }
  const feedbackByKpi = new Map<string, FeedbackItem[]>()
  for (const f of feedbackRows) {
    const arr = feedbackByKpi.get(f.kpiId) ?? []
    arr.push({ id: f.id, fromName: f.fromName, message: f.message, date: dt(f.createdAt) })
    feedbackByKpi.set(f.kpiId, arr)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">KPI Saya</h1>
        <p className="text-sm text-muted-foreground">
          Tinjau & setujui KPI yang diberikan atasan. Bila terlalu berat, minta revisi.
        </p>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border px-4 py-8 text-center text-sm text-muted-foreground">
          Belum ada KPI untuk Anda.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((k) => (
            <li key={k.id} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">{k.periodName}</p>
                  <p className="font-medium">{k.title}</p>
                </div>
                <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${KPI_STATUS_STYLE[k.status as KpiStatus]}`}>
                  {KPI_STATUS_LABEL[k.status as KpiStatus]}
                </span>
              </div>
              {k.description && <p className="mt-1 text-sm text-muted-foreground">{k.description}</p>}
              <div className="mt-2 flex flex-wrap gap-4 text-sm">
                <span><span className="text-muted-foreground">Bobot:</span> {k.weight}%</span>
                {k.target && <span><span className="text-muted-foreground">Target:</span> {k.target}</span>}
              </div>
              {k.status === "revision_requested" && k.revisionNote && (
                <p className="mt-2 text-xs text-muted-foreground">Catatan revisi Anda: {k.revisionNote}</p>
              )}
              {k.status === "proposed" && k.periodStatus === "planning" && <KpiAgreement kpiId={k.id} />}
              {k.status === "agreed" && k.periodStatus === "active" && (
                <KpiTracking
                  kpiId={k.id}
                  latestPercent={progressByKpi.get(k.id)?.[0]?.percent ?? 0}
                  progress={progressByKpi.get(k.id) ?? []}
                  feedback={feedbackByKpi.get(k.id) ?? []}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
