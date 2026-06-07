import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { isModuleActive } from "@/lib/modules"
import { ModuleLocked } from "@/components/module-locked"
import { getEmployeeIdByUser } from "@/modules/attendance/queries"
import { listMyKpi } from "@/modules/kpi/queries"
import { KPI_STATUS_LABEL, KPI_STATUS_STYLE, type KpiStatus } from "@/modules/kpi/schema"
import KpiForm from "./_form"

export default async function KpiPage() {
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

  const evaluations = await listMyKpi(tenantId, employeeId)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Penilaian KPI</h1>
        <p className="text-sm text-muted-foreground">
          Ajukan nilai KPI per periode untuk disetujui atasan/HR.
        </p>
      </div>

      <KpiForm />

      <div>
        <h2 className="mb-2 text-sm font-semibold">Riwayat Penilaian</h2>
        <div className="overflow-hidden rounded-xl border">
          <table className="min-w-full divide-y">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Periode</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Nilai</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {evaluations.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Belum ada penilaian KPI.
                  </td>
                </tr>
              ) : (
                evaluations.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-2 text-sm font-medium">{e.period}</td>
                    <td className="px-4 py-2 text-sm">{e.score}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${KPI_STATUS_STYLE[e.status as KpiStatus]}`}>
                        {KPI_STATUS_LABEL[e.status as KpiStatus]}
                      </span>
                      {e.status === "rejected" && e.rejectionReason && (
                        <p className="mt-1 text-xs text-muted-foreground">{e.rejectionReason}</p>
                      )}
                      {e.notes && (
                        <p className="mt-1 text-xs text-muted-foreground">{e.notes}</p>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
