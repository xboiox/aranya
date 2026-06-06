import { redirect } from "next/navigation"
import { auth, hasRole } from "@/lib/auth"
import { getLeaveBalanceQuota } from "@/modules/leave/queries"
import { listHolidays } from "@/modules/holidays/queries"
import LeaveSettings from "./_settings"

export default async function LeaveSettingsPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (!hasRole(session.user.roles, "hr_admin") || !session.user.tenantId) {
    redirect("/dashboard")
  }

  const [quota, holidays] = await Promise.all([
    getLeaveBalanceQuota(session.user.tenantId),
    listHolidays(session.user.tenantId),
  ])

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pengaturan Cuti</h1>
        <p className="text-sm text-muted-foreground">
          Atur kuota cuti tahunan dan hari libur perusahaan.
        </p>
      </div>
      <LeaveSettings
        quota={quota}
        holidays={holidays.map((h) => ({
          id: h.id,
          name: h.name,
          date: new Date(h.date).toLocaleDateString("id-ID", {
            timeZone: "Asia/Jakarta",
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          isRecurring: h.isRecurring,
          isNational: h.tenantId === null,
        }))}
      />
    </div>
  )
}
