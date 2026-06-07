import { redirect } from "next/navigation"
import { auth, hasRole } from "@/lib/auth"
import { isModuleActive } from "@/lib/modules"
import { ModuleLocked } from "@/components/module-locked"
import { listEmployees } from "@/modules/employees/queries"
import { listChecklist } from "@/modules/onboarding/queries"
import { CHECKLIST_TYPE_LABEL, isChecklistType, type ChecklistType } from "@/modules/onboarding/schema"
import ChecklistManager from "./_manager"

interface Props {
  searchParams: Promise<{ employeeId?: string; type?: string }>
}

export default async function ManageOnboardingPage({ searchParams }: Props) {
  const session = await auth()
  if (!session) redirect("/login")
  const tenantId = session.user.tenantId
  if (!hasRole(session.user.roles, "hr_admin") || !tenantId) {
    redirect("/dashboard")
  }
  if (!(await isModuleActive(tenantId, "MODULE_2"))) {
    return <ModuleLocked moduleCode="MODULE_2" />
  }

  const { employeeId, type: typeParam } = await searchParams
  const type: ChecklistType = isChecklistType(typeParam) ? typeParam : "onboarding"

  const employees = await listEmployees(tenantId)
  const selectedId = employeeId && employees.some((e) => e.id === employeeId) ? employeeId : ""
  const tasks = selectedId ? await listChecklist(tenantId, selectedId, type) : []
  const selectedName = employees.find((e) => e.id === selectedId)?.name ?? null

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Onboarding / Offboarding</h1>
        <p className="text-sm text-muted-foreground">
          Kelola checklist tugas untuk karyawan baru atau yang keluar.
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-xl border p-4">
        <div className="space-y-1">
          <label htmlFor="employeeId" className="text-xs font-medium text-muted-foreground">Karyawan</label>
          <select
            id="employeeId"
            name="employeeId"
            defaultValue={selectedId}
            className="block w-56 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">— Pilih karyawan —</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name ?? e.email}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="type" className="text-xs font-medium text-muted-foreground">Tipe</label>
          <select
            id="type"
            name="type"
            defaultValue={type}
            className="block w-44 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="onboarding">{CHECKLIST_TYPE_LABEL.onboarding}</option>
            <option value="offboarding">{CHECKLIST_TYPE_LABEL.offboarding}</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Tampilkan
        </button>
      </form>

      {selectedId ? (
        <ChecklistManager
          employeeId={selectedId}
          employeeName={selectedName}
          type={type}
          tasks={tasks.map((t) => ({ id: t.id, task: t.task, isDone: t.isDone }))}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Pilih karyawan & tipe checklist untuk mulai mengelola tugas.
        </p>
      )}
    </div>
  )
}
