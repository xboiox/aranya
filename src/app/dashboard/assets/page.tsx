import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { isModuleActive } from "@/lib/modules"
import { ModuleLocked } from "@/components/module-locked"
import { getEmployeeIdByUser } from "@/modules/attendance/queries"
import { listMyAssets } from "@/modules/asset/queries"
import { assetCategoryLabel } from "@/modules/asset/schema"

export default async function AssetsPage() {
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

  const myAssets = await listMyAssets(tenantId, employeeId)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Aset Saya</h1>
        <p className="text-sm text-muted-foreground">Aset perusahaan yang dipinjamkan kepada Anda.</p>
      </div>

      {myAssets.length === 0 ? (
        <p className="text-sm text-muted-foreground">Tidak ada aset yang dipinjamkan.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {myAssets.map((a) => (
            <div key={a.id} className="rounded-lg border p-3">
              <p className="font-medium">{a.name}</p>
              <p className="text-xs text-muted-foreground">
                {assetCategoryLabel(a.category)}
                {a.serialNumber ? ` · SN: ${a.serialNumber}` : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
