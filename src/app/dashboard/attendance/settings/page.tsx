import { redirect } from "next/navigation"
import { auth, hasRole } from "@/lib/auth"
import { getGeofenceConfig } from "@/modules/attendance/queries"
import GeofenceSettings from "./_settings"

export default async function AttendanceSettingsPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (!hasRole(session.user.roles, "hr_admin") || !session.user.tenantId) {
    redirect("/dashboard")
  }

  const config = await getGeofenceConfig(session.user.tenantId)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pengaturan Absensi</h1>
        <p className="text-sm text-muted-foreground">
          Atur geofencing dan titik lokasi kantor untuk validasi absensi.
        </p>
      </div>
      <GeofenceSettings enabled={config.enabled} locations={config.locations} />
    </div>
  )
}
