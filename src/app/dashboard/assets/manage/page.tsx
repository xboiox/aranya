import { redirect } from "next/navigation"
import { auth, hasRole } from "@/lib/auth"
import { isModuleActive } from "@/lib/modules"
import { ModuleLocked } from "@/components/module-locked"
import { listAllAssets } from "@/modules/asset/queries"
import { listLeadCandidates } from "@/modules/employees/queries"
import {
  Table,
  TableBody,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Aset</TableHead>
            <TableHead>Dipinjam Oleh</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.length === 0 ? (
            <TableEmpty colSpan={3}>Belum ada aset.</TableEmpty>
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
        </TableBody>
      </Table>
    </div>
  )
}
