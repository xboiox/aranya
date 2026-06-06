import Link from "next/link"
import { redirect, notFound } from "next/navigation"
import { auth, hasRole } from "@/lib/auth"
import { getEmployee, listLeadCandidates } from "@/modules/employees/queries"
import EmployeeEditForm from "./_form"

interface Props {
  params: Promise<{ id: string }>
}

export default async function EmployeeDetailPage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  if (!session) redirect("/login")
  if (!hasRole(session.user.roles, "hr_admin") || !session.user.tenantId) {
    redirect("/dashboard")
  }

  const employee = await getEmployee(session.user.tenantId, id)
  if (!employee) notFound()

  const leads = await listLeadCandidates(session.user.tenantId, id)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/employees" className="text-sm text-primary hover:underline">
          ← Kembali ke daftar
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{employee.name ?? "—"}</h1>
        <p className="text-sm text-muted-foreground">
          {employee.email} ·{" "}
          {employee.isActivated ? "Akun aktif" : "Menunggu aktivasi"}
        </p>
      </div>

      <EmployeeEditForm employee={employee} leads={leads} />
    </div>
  )
}
