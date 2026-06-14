import { redirect } from "next/navigation"
import { auth, hasRole } from "@/lib/auth"
import { isModuleActive } from "@/lib/modules"
import { ModuleLocked } from "@/components/module-locked"
import { listAllTraining } from "@/modules/training/queries"
import { listLeadCandidates } from "@/modules/employees/queries"
import { TRAINING_STATUS_LABEL } from "@/modules/training/schema"
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import TrainingForm from "./_form"
import DeleteTrainingButton from "./_delete"

function dateLabel(d: Date | null): string {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export default async function ManageTrainingPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const tenantId = session.user.tenantId
  if (!hasRole(session.user.roles, "hr_admin") || !tenantId) {
    redirect("/dashboard")
  }
  if (!(await isModuleActive(tenantId, "MODULE_2"))) {
    return <ModuleLocked moduleCode="MODULE_2" />
  }

  const [records, employees] = await Promise.all([
    listAllTraining(tenantId),
    listLeadCandidates(tenantId),
  ])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kelola Training & Sertifikasi</h1>
        <p className="text-sm text-muted-foreground">Catat pelatihan & sertifikasi karyawan.</p>
      </div>

      <TrainingForm employees={employees.map((e) => ({ id: e.id, name: e.name }))} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Karyawan</TableHead>
            <TableHead>Judul</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Berlaku s/d</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.length === 0 ? (
            <TableEmpty colSpan={5}>Belum ada data training.</TableEmpty>
          ) : (
            records.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.employeeName ?? "—"}</TableCell>
                <TableCell>
                  {r.title}
                  <span className="block text-xs text-muted-foreground">
                    {r.type === "certification" ? "Sertifikasi" : "Pelatihan"}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">{TRAINING_STATUS_LABEL[r.status]}</TableCell>
                <TableCell>{dateLabel(r.expiryDate)}</TableCell>
                <TableCell className="text-right"><DeleteTrainingButton id={r.id} /></TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
