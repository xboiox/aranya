import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { isModuleActive } from "@/lib/modules"
import { ModuleLocked } from "@/components/module-locked"
import { getEmployeeIdByUser } from "@/modules/attendance/queries"
import { listMyChecklist, type ChecklistTask } from "@/modules/onboarding/queries"
import { CHECKLIST_TYPE_LABEL, type ChecklistType } from "@/modules/onboarding/schema"

function ChecklistGroup({ type, tasks }: { type: ChecklistType; tasks: ChecklistTask[] }) {
  if (tasks.length === 0) return null
  const done = tasks.filter((t) => t.isDone).length
  const pct = Math.round((done / tasks.length) * 100)

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{CHECKLIST_TYPE_LABEL[type]}</h2>
        <span className="text-xs text-muted-foreground">{done} / {tasks.length} ({pct}%)</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <ul className="divide-y rounded-lg border">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                t.isDone ? "bg-emerald-500 text-white" : "border border-input"
              }`}
            >
              {t.isDone ? "✓" : ""}
            </span>
            <span className={t.isDone ? "text-muted-foreground line-through" : ""}>{t.task}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default async function MyChecklistPage() {
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
    return <p className="text-sm text-muted-foreground">Fitur ini hanya untuk akun karyawan.</p>
  }

  const all = await listMyChecklist(tenantId, employeeId)
  const onboarding = all.filter((t) => t.type === "onboarding")
  const offboarding = all.filter((t) => t.type === "offboarding")

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Checklist Saya</h1>
        <p className="text-sm text-muted-foreground">
          Daftar tugas onboarding/offboarding Anda (dikelola oleh HR).
        </p>
      </div>

      {all.length === 0 ? (
        <p className="rounded-xl border px-4 py-8 text-center text-sm text-muted-foreground">
          Belum ada checklist untuk Anda.
        </p>
      ) : (
        <>
          <ChecklistGroup type="onboarding" tasks={onboarding} />
          <ChecklistGroup type="offboarding" tasks={offboarding} />
        </>
      )}
    </div>
  )
}
