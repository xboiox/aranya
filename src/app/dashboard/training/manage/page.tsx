import { redirect } from "next/navigation"
import { auth, hasRole } from "@/lib/auth"
import { isModuleActive } from "@/lib/modules"
import { ModuleLocked } from "@/components/module-locked"
import { listAllTraining } from "@/modules/training/queries"
import { listLeadCandidates } from "@/modules/employees/queries"
import { TRAINING_STATUS_LABEL } from "@/modules/training/schema"
import TrainingForm from "./_form"
import DeleteTrainingButton from "./_delete"

function dateLabel(d: Date | null): string {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export default async function ManageTrainingPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const tenantId = session.user.tenantId
  if (!hasRole(session.user.roles, "hr_admin") || !tenantId) {
    redirect("/dashboard")
  }
  if (!(await isModuleActive(tenantId, "MODULE_2"))) {
    return <ModuleLocked moduleCode="MODULE_2" />
  }

  const [records, employees] = await Promise.all([
    listAllTraining(tenantId),
    listLeadCandidates(tenantId),
  ])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kelola Training & Sertifikasi</h1>
        <p className="text-sm text-muted-foreground">Catat pelatihan & sertifikasi karyawan.</p>
      </div>

      <TrainingForm employees={employees.map((e) => ({ id: e.id, name: e.name }))} />

      <div className="overflow-hidden rounded-xl border">
        <table className="min-w-full divide-y text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Karyawan</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Judul</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Status</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Berlaku s/d</th>
              <th className="px-4 py-2 text-right text-xs font-medium uppercase text-muted-foreground">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {records.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Belum ada data training.
                </td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2">{r.employeeName ?? "—"}</td>
                  <td className="px-4 py-2">
                    {r.title}
                    <span className="block text-xs text-muted-foreground">
                      {r.type === "certification" ? "Sertifikasi" : "Pelatihan"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{TRAINING_STATUS_LABEL[r.status]}</td>
                  <td className="px-4 py-2">{dateLabel(r.expiryDate)}</td>
                  <td className="px-4 py-2 text-right"><DeleteTrainingButton id={r.id} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
