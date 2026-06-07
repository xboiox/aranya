import { redirect } from "next/navigation"
import { auth, hasRole } from "@/lib/auth"
import { isModuleActive } from "@/lib/modules"
import { ModuleLocked } from "@/components/module-locked"
import { getHrAnalytics, type Breakdown } from "@/modules/analytics/queries"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function StatCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-3xl font-bold">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}

function BreakdownCard({ title, rows }: { title: string; rows: Breakdown[] }) {
  const max = rows.reduce((m, r) => Math.max(m, r.count), 0) || 1
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada data.</p>
        ) : (
          rows.map((r) => (
            <div key={r.label} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{r.label}</span>
                <span className="font-medium">{r.count}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.round((r.count / max) * 100)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

export default async function AnalyticsPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const tenantId = session.user.tenantId
  if (!hasRole(session.user.roles, "hr_admin") || !tenantId) {
    redirect("/dashboard")
  }
  if (!(await isModuleActive(tenantId, "MODULE_2"))) {
    return <ModuleLocked moduleCode="MODULE_2" />
  }

  const a = await getHrAnalytics(tenantId)
  const headcount = a.totalActive + a.totalInactive
  const attendanceRate =
    a.totalActive === 0 ? 0 : Math.round((a.presentToday / a.totalActive) * 100)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">HR Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Ringkasan tenaga kerja & aktivitas hari ini.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Karyawan Aktif" value={a.totalActive} hint={`${headcount} total terdaftar`} />
        <StatCard label="Hadir Hari Ini" value={a.presentToday} hint={`${attendanceRate}% dari aktif`} />
        <StatCard label="Cuti Hari Ini" value={a.onLeaveToday} />
        <StatCard label="Menunggu Persetujuan" value={a.pendingApprovals} hint="cuti + lembur + KPI" />
        <StatCard label="Karyawan Baru (bln ini)" value={a.newHiresThisMonth} />
        <StatCard label="Nonaktif" value={a.totalInactive} />
        <StatCard
          label="Rata-rata KPI"
          value={a.avgKpiScore ?? "—"}
          hint="penilaian disetujui"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <BreakdownCard title="Per Departemen" rows={a.byDepartment} />
        <BreakdownCard title="Per Tipe Kontrak" rows={a.byContractType} />
        <BreakdownCard title="Per Gender" rows={a.byGender} />
      </div>
    </div>
  )
}
