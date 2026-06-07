import { redirect } from "next/navigation"
import { auth, hasRole } from "@/lib/auth"
import { isModuleActive } from "@/lib/modules"
import { ModuleLocked } from "@/components/module-locked"
import { listAllAssets } from "@/modules/asset/queries"
import { listLeadCandidates } from "@/modules/employees/queries"
import AssetForm from "./_form"
import AssetRow from "./_row"

export default async function ManageAssetsPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const tenantId = session.user.tenantId
  if (!hasRole(session.user.roles, "hr_admin") || !tenantId) {
    redirect("/dashboard")
  }
  if (!(await isModuleActive(tenantId, "MODULE_2"))) {
    return <ModuleLocked moduleCode="MODULE_2" />
  }

  const [assets, employees] = await Promise.all([
    listAllAssets(tenantId),
    listLeadCandidates(tenantId),
  ])
  const empOptions = employees.map((e) => ({ id: e.id, name: e.name }))

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kelola Aset</h1>
        <p className="text-sm text-muted-foreground">
          Catat aset perusahaan & pinjamkan ke karyawan ({assets.length} aset).
        </p>
      </div>

      <AssetForm />

      <div className="overflow-hidden rounded-xl border">
        <table className="min-w-full divide-y">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Aset</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Dipinjam Oleh</th>
              <th className="px-4 py-2 text-right text-xs font-medium uppercase text-muted-foreground">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {assets.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Belum ada aset.
                </td>
              </tr>
            ) : (
              assets.map((a) => (
                <AssetRow
                  key={a.id}
                  id={a.id}
                  name={a.name}
                  category={a.category}
                  serialNumber={a.serialNumber}
                  assignedToId={a.assignedToId}
                  employees={empOptions}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
