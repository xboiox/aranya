import { redirect } from "next/navigation"
import { auth, hasRole } from "@/lib/auth"
import { listLeadCandidates } from "@/modules/employees/queries"
import EmployeeCreateForm from "./_form"

export default async function NewEmployeePage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (!hasRole(session.user.roles, "hr_admin") || !session.user.tenantId) {
    redirect("/dashboard")
  }

  const leads = await listLeadCandidates(session.user.tenantId)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tambah Karyawan</h1>
        <p className="text-sm text-muted-foreground">
          Karyawan akan menerima undangan email untuk mengaktifkan akun.
        </p>
      </div>
      <EmployeeCreateForm leads={leads} />
    </div>
  )
}
