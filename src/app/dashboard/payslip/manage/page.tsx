import { redirect } from "next/navigation"
import { auth, hasRole } from "@/lib/auth"
import { listAllPayslips, listEmployeeOptions } from "@/modules/payslip/queries"
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Karyawan</TableHead>
              <TableHead>Periode</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slips.length === 0 ? (
              <TableEmpty colSpan={3}>Belum ada slip gaji.</TableEmpty>
            ) : (
              slips.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.employeeName ?? "—"}</TableCell>
                  <TableCell>{monthLabel(s.month)} {s.year}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="outline" render={<a href={`/api/payslips/${s.id}/download`} />}>
                        <Download className="size-4" />
                      </Button>
                      <DeletePayslipButton id={s.id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
