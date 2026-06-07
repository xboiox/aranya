import { redirect } from "next/navigation"
import { auth, hasRole } from "@/lib/auth"
import { listAllPayslips, listEmployeeOptions } from "@/modules/payslip/queries"
import { monthLabel } from "@/modules/payslip/schema"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import PayslipUploadForm from "./_form"
import DeletePayslipButton from "./_delete"

export default async function ManagePayslipPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (!hasRole(session.user.roles, "hr_admin") || !session.user.tenantId) {
    redirect("/dashboard")
  }

  const [slips, employees] = await Promise.all([
    listAllPayslips(session.user.tenantId),
    listEmployeeOptions(session.user.tenantId),
  ])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kelola Slip Gaji</h1>
        <p className="text-sm text-muted-foreground">Unggah slip gaji PDF per karyawan & periode.</p>
      </div>

      <PayslipUploadForm employees={employees} />

      <div>
        <h2 className="mb-2 text-sm font-semibold">Slip Gaji Terunggah ({slips.length})</h2>
        <div className="overflow-hidden rounded-xl border">
          <table className="min-w-full divide-y">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Karyawan</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Periode</th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase text-muted-foreground">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {slips.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Belum ada slip gaji.
                  </td>
                </tr>
              ) : (
                slips.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2 text-sm">{s.employeeName ?? "—"}</td>
                    <td className="px-4 py-2 text-sm">{monthLabel(s.month)} {s.year}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="outline" render={<a href={`/api/payslips/${s.id}/download`} />}>
                          <Download className="size-4" />
                        </Button>
                        <DeletePayslipButton id={s.id} />
                      </div>
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
