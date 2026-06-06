import Link from "next/link"
import { redirect } from "next/navigation"
import { auth, hasRole } from "@/lib/auth"
import { listEmployees } from "@/modules/employees/queries"
import { Button } from "@/components/ui/button"

export default async function EmployeesPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (!hasRole(session.user.roles, "hr_admin") || !session.user.tenantId) {
    redirect("/dashboard")
  }

  const employees = await listEmployees(session.user.tenantId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Karyawan</h1>
          <p className="text-sm text-muted-foreground">
            {employees.length} karyawan terdaftar
          </p>
        </div>
        <Button render={<Link href="/dashboard/employees/new" />}>
          + Tambah Karyawan
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <table className="min-w-full divide-y">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Nama</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Jabatan</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Departemen</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {employees.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  Belum ada karyawan.{" "}
                  <Link href="/dashboard/employees/new" className="text-primary underline">
                    Tambah sekarang.
                  </Link>
                </td>
              </tr>
            ) : (
              employees.map((e) => (
                <tr key={e.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm">
                    <Link href={`/dashboard/employees/${e.id}`} className="font-medium hover:underline">
                      {e.name ?? "—"}
                    </Link>
                    <div className="text-xs text-muted-foreground">{e.email}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">{e.position ?? "—"}</td>
                  <td className="px-4 py-3 text-sm">{e.department ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium " +
                        (!e.isActive
                          ? "bg-muted text-muted-foreground"
                          : e.isActivated
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700")
                      }
                    >
                      {!e.isActive ? "Nonaktif" : e.isActivated ? "Aktif" : "Menunggu aktivasi"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
