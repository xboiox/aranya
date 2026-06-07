import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { isModuleActive } from "@/lib/modules"
import { ModuleLocked } from "@/components/module-locked"
import { getEmployeeIdByUser } from "@/modules/attendance/queries"
import { listMyTraining } from "@/modules/training/queries"
import { TRAINING_STATUS_LABEL, certStatus } from "@/modules/training/schema"

function dateLabel(d: Date | null): string {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

const CERT_BADGE: Record<string, string> = {
  expired: "bg-red-100 text-red-700",
  expiring: "bg-amber-100 text-amber-700",
  valid: "bg-green-100 text-green-700",
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

      <div className="overflow-hidden rounded-xl border">
        <table className="min-w-full divide-y text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Judul</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Jenis</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Status</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Berlaku s/d</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {records.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  Belum ada data training.
                </td>
              </tr>
            ) : (
              records.map((r) => {
                const cs = certStatus(r.expiryDate)
                return (
                  <tr key={r.id}>
                    <td className="px-4 py-2">
                      {r.title}
                      {r.provider && <span className="block text-xs text-muted-foreground">{r.provider}</span>}
                    </td>
                    <td className="px-4 py-2 capitalize">{r.type === "certification" ? "Sertifikasi" : "Pelatihan"}</td>
                    <td className="px-4 py-2 text-muted-foreground">{TRAINING_STATUS_LABEL[r.status]}</td>
                    <td className="px-4 py-2">
                      {dateLabel(r.expiryDate)}
                      {cs && (
                        <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${CERT_BADGE[cs]}`}>
                          {CERT_LABEL[cs]}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
