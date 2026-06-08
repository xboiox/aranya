import Link from "next/link"
import { redirect } from "next/navigation"
import { auth, hasRole } from "@/lib/auth"
import { EMPLOYEE_CSV_HEADERS } from "@/modules/employees/bulk"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import BulkImportForm from "./_form"

export default async function ImportEmployeesPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (!hasRole(session.user.roles, "hr_admin") || !session.user.tenantId) {
    redirect("/dashboard")
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Import Karyawan via CSV</h1>
        <p className="text-sm text-muted-foreground">
          Tambah banyak karyawan sekaligus. Tiap karyawan menerima email undangan.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border p-4">
        <h2 className="text-sm font-semibold">1. Unduh template</h2>
        <p className="text-sm text-muted-foreground">
          Kolom: <code className="text-xs">{EMPLOYEE_CSV_HEADERS.join(", ")}</code>. Wajib diisi:
          {" "}<strong>email</strong> & <strong>name</strong>. <code className="text-xs">role</code>{" "}
          = employee/manager (default employee). <code className="text-xs">contractType</code> =
          probation/PKWT/PKWTT/kontrak. <code className="text-xs">joinDate</code> = YYYY-MM-DD.
          {" "}<code className="text-xs">reportsToEmail</code> = email atasan (boleh dibuat di baris
          lebih atas pada file yang sama).
        </p>
        <Button variant="outline" size="sm" render={<a href="/api/employees/import/template" />}>
          <Download className="size-4" />
          Unduh template CSV
        </Button>
      </div>

      <div className="space-y-3 rounded-xl border p-4">
        <h2 className="text-sm font-semibold">2. Unggah file</h2>
        <BulkImportForm />
      </div>

      <Link href="/dashboard/employees" className="text-sm text-primary hover:underline">
        ← Kembali ke daftar karyawan
      </Link>
    </div>
  )
}
