import { redirect } from "next/navigation"
import { auth, hasRole } from "@/lib/auth"
import { isModuleActive } from "@/lib/modules"
import { ModuleLocked } from "@/components/module-locked"

export default async function PayrollPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (!hasRole(session.user.roles, "hr_admin") || !session.user.tenantId) {
    redirect("/dashboard")
  }

  // Gating: fitur Payroll butuh Modul 3 aktif untuk tenant ini
  const active = await isModuleActive(session.user.tenantId, "MODULE_3")
  if (!active) return <ModuleLocked moduleCode="MODULE_3" />

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Payroll</h1>
      <p className="text-sm text-muted-foreground">
        Kalkulator payroll (PPh 21 TER, BPJS) & slip gaji otomatis — segera hadir di Modul 3.
      </p>
    </div>
  )
}
