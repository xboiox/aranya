import Link from "next/link"
import { redirect } from "next/navigation"
import { auth, hasRole } from "@/lib/auth"
import { listEmployeesPaginated } from "@/modules/employees/queries"
import { Button } from "@/components/ui/button"
import { Pagination } from "@/components/pagination"
import { Download, Upload } from "lucide-react"

const PAGE_SIZE = 25

interface Props {
  searchParams: Promise<{ page?: string; q?: string }>
}

export default async function EmployeesPage({ searchParams }: Props) {
  const session = await auth()
  if (!session) redirect("/login")
  if (!hasRole(session.user.roles, "hr_admin") || !session.user.tenantId) {
    redirect("/dashboard")
  }

  const { page: pageParam, q } = await searchParams
  const page = Math.max(0, parseInt(pageParam ?? "0", 10) || 0)
  const { items: employees, total } = await listEmployeesPaginated(
    session.user.tenantId,
    page,
    PAGE_SIZE,
    q,
  )
  const hasNext = (page + 1) * PAGE_SIZE < total

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Karyawan</h1>
          <p className="text-sm text-muted-foreground">{total} karyawan terdaftar</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<a href="/api/employees/export" />}>
            <Download className="size-4" />
            Export CSV
          </Button>
          <Button variant="outline" render={<Link href="/dashboard/employees/import" />}>
            <Upload className="size-4" />
            Import CSV
          </Button>
          <Button render={<Link href="/dashboard/employees/new" />}>
            + Tambah Karyawan
          </Button>
        </div>
      </div>

      <form method="get" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Cari nama atau email…"
          className="block w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <Button type="submit" variant="outline" size="sm">Cari</Button>
        {q && (
          <Button variant="ghost" size="sm" render={<Link href="/dashboard/employees" />}>
            Reset
          </Button>
        )}
      </form>

      <div className="overflow-hidden rounded-xl border">
        <table className="min-w-full divide-y">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Nama</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Jabatan</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Departemen</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Atasan Langsung</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {employees.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
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
                  <td className="px-4 py-3 text-sm">{e.managerName ?? "—"}</td>
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

      <Pagination
        basePath="/dashboard/employees"
        params={{ q }}
        page={page}
        hasNext={hasNext}
        total={total}
        pageSize={PAGE_SIZE}
      />
    </div>
  )
}
