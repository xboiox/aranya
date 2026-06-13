import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getEmployeeIdByUser } from "@/modules/attendance/queries"
import { listMyPayslips } from "@/modules/payslip/queries"
import { monthLabel } from "@/modules/payslip/schema"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Periode</TableHead>
            <TableHead className="text-right">Unduh</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {slips.length === 0 ? (
            <TableEmpty colSpan={2}>Belum ada slip gaji.</TableEmpty>
          ) : (
            slips.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{monthLabel(s.month)} {s.year}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" render={<a href={`/api/payslips/${s.id}/download`} />}>
                    <Download className="size-4" /> Unduh
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
