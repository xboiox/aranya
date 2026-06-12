import Link from "next/link"
import { redirect, notFound } from "next/navigation"
import { auth, hasAnyRole, hasRole } from "@/lib/auth"
import { isModuleActive } from "@/lib/modules"
import { ModuleLocked } from "@/components/module-locked"
import {
  getScorecard,
  getScorecardTree,
  progressForTasks,
  feedbackForTasks,
} from "@/modules/kpi/queries"
import { scorecardWeightProblems, scorecardScore } from "@/modules/kpi/validation"
import {
  SCORECARD_STATUS_LABEL,
  SCORECARD_STATUS_STYLE,
  type ScorecardStatus,
} from "@/modules/kpi/schema"
import ManagerScorecard, { type MgrView } from "./_manager-scorecard"

function dt(d: Date): string {
  return new Date(d).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" })
}

interface Props { params: Promise<{ scorecardId: string }> }

export default async function ScorecardDetailPage({ params }: Props) {
  const session = await auth()
  if (!session) redirect("/login")
  const tenantId = session.user.tenantId
  if (!tenantId || !hasAnyRole(session.user.roles, "manager", "hr_admin")) redirect("/dashboard")
  if (!(await isModuleActive(tenantId, "MODULE_2"))) return <ModuleLocked moduleCode="MODULE_2" />

  const { scorecardId } = await params
  const sc = await getScorecard(tenantId, scorecardId)
  if (!sc) notFound()
  const isHr = hasRole(session.user.roles, "hr_admin")
  if (!isHr && sc.managerId !== session.user.id) redirect("/dashboard/kpi/team")

  const epics = await getScorecardTree(tenantId, scorecardId)
  const taskIds = epics.flatMap((e) => e.tasks.map((t) => t.id))
  const isActive = sc.periodStatus === "active"
  const [progress, feedback] = isActive
    ? await Promise.all([progressForTasks(tenantId, taskIds), feedbackForTasks(tenantId, taskIds)])
    : [[], []]
  const latestByTask = new Map<string, number>()
  for (const p of progress) if (!latestByTask.has(p.taskId)) latestByTask.set(p.taskId, p.percent)

  const weightProblems = scorecardWeightProblems(
    epics.map((e) => ({ name: e.name, weight: e.weight, taskWeights: e.tasks.map((t) => t.weight) })),
  )
  const finalTotal = scorecardScore(
    epics.map((e) => ({ weight: e.weight, tasks: e.tasks.map((t) => ({ weight: t.weight, finalScore: t.appraisal?.finalScore ?? null })) })),
  )

  const view: MgrView = {
    scorecardId,
    periodStatus: sc.periodStatus,
    status: sc.status,
    revisionNote: sc.revisionNote,
    isHr,
    weightProblems,
    finalTotal,
    epics: epics.map((e) => ({
      id: e.id,
      name: e.name,
      weight: e.weight,
      taskTotal: e.tasks.reduce((s, t) => s + t.weight, 0),
      tasks: e.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        weight: t.weight,
        targetNote: t.targetNote,
        rubric: t.rubric,
        realization: t.appraisal?.realization ?? null,
        selfScore: t.appraisal?.selfScore ?? null,
        managerScore: t.appraisal?.managerScore ?? null,
        managerNote: t.appraisal?.managerNote ?? null,
        notesOnAchievement: t.appraisal?.notesOnAchievement ?? null,
        finalScore: t.appraisal?.finalScore ?? null,
        latestPercent: latestByTask.get(t.id) ?? null,
        feedback: feedback.filter((f) => f.taskId === t.id).map((f) => ({ id: f.id, fromName: f.fromName, message: f.message, date: dt(f.createdAt) })),
      })),
    })),
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <Link href="/dashboard/kpi/team" className="text-sm text-primary hover:underline">← KPI Tim</Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">Scorecard — {sc.employeeName ?? "Karyawan"}</h1>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SCORECARD_STATUS_STYLE[sc.status as ScorecardStatus]}`}>
            {SCORECARD_STATUS_LABEL[sc.status as ScorecardStatus]}
          </span>
        </div>
      </div>
      <ManagerScorecard view={view} />
    </div>
  )
}
