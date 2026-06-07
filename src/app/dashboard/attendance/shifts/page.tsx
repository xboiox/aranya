import { redirect } from "next/navigation"
import { auth, hasRole } from "@/lib/auth"
import { listShifts } from "@/modules/shift/queries"
import ShiftManager from "./_manager"

export default async function ShiftsPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (!hasRole(session.user.roles, "hr_admin") || !session.user.tenantId) {
    redirect("/dashboard")
  }

  const shifts = await listShifts(session.user.tenantId)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Shift Kerja</h1>
        <p className="text-sm text-muted-foreground">
          Definisikan shift & toleransi keterlambatan. Tetapkan shift ke karyawan di menu Karyawan.
        </p>
      </div>
      <ShiftManager
        shifts={shifts.map((s) => ({
          id: s.id,
          name: s.name,
          startTime: s.startTime,
          endTime: s.endTime,
          lateToleranceMinutes: s.lateToleranceMinutes,
        }))}
      />
    </div>
  )
}
