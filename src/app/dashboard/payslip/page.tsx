import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getEmployeeIdByUser } from "@/modules/attendance/queries"
import { listMyPayslips } from "@/modules/payslip/queries"
import { monthLabel } from "@/modules/payslip/schema"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

export default async function PayslipPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const tenantId = session.user.tenantId
  if (!tenantId) {
    return <p className="text-sm text-muted-foreground">Akun tidak terhubung ke perusahaan.</p>
  }

  const employeeId = await getEmployeeIdByUser(tenantId, session.user.id)
  if (!employeeId) {
    return <p className="text-sm text-muted-foreground">Fitur slip gaji hanya untuk akun karyawan.</p>
  }

  const slips = await listMyPayslips(tenantId, employeeId)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Slip Gaji</h1>
        <p className="text-sm text-muted-foreground">Unduh slip gaji Anda per periode.</p>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <table className="min-w-full divide-y">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Periode</th>
              <th className="px-4 py-2 text-right text-xs font-medium uppercase text-muted-foreground">Unduh</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {slips.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Belum ada slip gaji.
                </td>
              </tr>
            ) : (
              slips.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2 text-sm">{monthLabel(s.month)} {s.year}</td>
                  <td className="px-4 py-2 text-right">
                    <Button size="sm" variant="outline" render={<a href={`/api/payslips/${s.id}/download`} />}>
                      <Download className="size-4" /> Unduh
                    </Button>
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
