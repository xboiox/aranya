import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { isModuleActive } from "@/lib/modules"
import { ModuleLocked } from "@/components/module-locked"
import { getEmployeeIdByUser } from "@/modules/attendance/queries"
import { listMyTraining } from "@/modules/training/queries"
import { TRAINING_STATUS_LABEL, certStatus } from "@/modules/training/schema"
import { Badge, type BadgeVariant } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function dateLabel(d: Date | null): string {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

const CERT_VARIANT: Record<string, BadgeVariant> = {
  expired: "destructive",
  expiring: "warning",
  valid: "success",
}
const CERT_LABEL: Record<string, string> = {
  expired: "Kedaluwarsa",
  expiring: "Segera berakhir",
  valid: "Berlaku",
}

export default async function TrainingPage() {
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

  const records = await listMyTraining(tenantId, employeeId)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Training & Sertifikasi</h1>
        <p className="text-sm text-muted-foreground">Riwayat pelatihan & sertifikasi Anda.</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Judul</TableHead>
            <TableHead>Jenis</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Berlaku s/d</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.length === 0 ? (
            <TableEmpty colSpan={4}>Belum ada data training.</TableEmpty>
          ) : (
            records.map((r) => {
              const cs = certStatus(r.expiryDate)
              return (
                <TableRow key={r.id}>
                  <TableCell>
                    {r.title}
                    {r.provider && <span className="block text-xs text-muted-foreground">{r.provider}</span>}
                  </TableCell>
                  <TableCell className="capitalize">{r.type === "certification" ? "Sertifikasi" : "Pelatihan"}</TableCell>
                  <TableCell className="text-muted-foreground">{TRAINING_STATUS_LABEL[r.status]}</TableCell>
                  <TableCell>
                    {dateLabel(r.expiryDate)}
                    {cs && (
                      <Badge variant={CERT_VARIANT[cs]} className="ml-1.5">
                        {CERT_LABEL[cs]}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
