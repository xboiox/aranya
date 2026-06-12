import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { isModuleActive } from "@/lib/modules"
import { ModuleLocked } from "@/components/module-locked"
import { getEmployeeIdByUser } from "@/modules/attendance/queries"
import {
  listMyScorecards,
  getScorecardTree,
  subtasksForTasks,
  progressForTasks,
  feedbackForTasks,
} from "@/modules/kpi/queries"
import { scorecardScore } from "@/modules/kpi/validation"
import EmployeeScorecard, { type ScorecardView } from "./_scorecard"

function dt(d: Date): string {
  return new Date(d).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" })
}

export default async function MyKpiPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const tenantId = session.user.tenantId
  if (!tenantId) return <p className="text-sm text-muted-foreground">Akun tidak terhubung ke perusahaan.</p>
  if (!(await isModuleActive(tenantId, "MODULE_2"))) return <ModuleLocked moduleCode="MODULE_2" />

  const employeeId = await getEmployeeIdByUser(tenantId, session.user.id)
  if (!employeeId) return <p className="text-sm text-muted-foreground">Fitur KPI hanya untuk akun karyawan.</p>

  const cards = await listMyScorecards(tenantId, employeeId)

  const views: ScorecardView[] = []
  for (const c of cards) {
    const epics = await getScorecardTree(tenantId, c.scorecardId)
    const taskIds = epics.flatMap((e) => e.tasks.map((t) => t.id))
    const isActive = c.periodStatus === "active"
    const [subs, progress, feedback] = isActive
      ? await Promise.all([
          subtasksForTasks(tenantId, taskIds),
          progressForTasks(tenantId, taskIds),
          feedbackForTasks(tenantId, taskIds),
        ])
      : [[], [], []]
    const latestByTask = new Map<string, number>()
    for (const p of progress) if (!latestByTask.has(p.taskId)) latestByTask.set(p.taskId, p.percent)

    const finalTotal = scorecardScore(
      epics.map((e) => ({ weight: e.weight, tasks: e.tasks.map((t) => ({ weight: t.weight, finalScore: t.appraisal?.finalScore ?? null })) })),
    )

    views.push({
      scorecardId: c.scorecardId,
      periodName: c.periodName,
      periodStatus: c.periodStatus,
      status: c.status,
      revisionNote: c.revisionNote,
      finalTotal,
      epics: epics.map((e) => ({
        id: e.id,
        name: e.name,
        weight: e.weight,
        tasks: e.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          weight: t.weight,
          targetNote: t.targetNote,
          rubric: t.rubric,
          realization: t.appraisal?.realization ?? null,
          selfScore: t.appraisal?.selfScore ?? null,
          managerNote: t.appraisal?.managerNote ?? null,
          finalScore: t.appraisal?.finalScore ?? null,
          latestPercent: latestByTask.get(t.id) ?? null,
          subtasks: subs.filter((s) => s.taskId === t.id).map((s) => ({ id: s.id, title: s.title, isDone: s.isDone })),
          feedback: feedback.filter((f) => f.taskId === t.id).map((f) => ({ id: f.id, fromName: f.fromName, message: f.message, date: dt(f.createdAt) })),
        })),
      })),
    })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">KPI Saya</h1>
        <p className="text-sm text-muted-foreground">Scorecard KPI Anda per periode.</p>
      </div>
      {views.length === 0 ? (
        <p className="rounded-xl border px-4 py-8 text-center text-sm text-muted-foreground">Belum ada scorecard KPI untuk Anda.</p>
      ) : (
        views.map((v) => <EmployeeScorecard key={v.scorecardId} view={v} />)
      )}
    </div>
  )
}
