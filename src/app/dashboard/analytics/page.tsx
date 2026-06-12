import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
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

function BreakdownCard({
  title,
  rows,
  emptyLabel,
}: {
  title: string
  rows: Breakdown[]
  emptyLabel: string
}) {
  const max = rows.reduce((m, r) => Math.max(m, r.count), 0) || 1
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
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
  const t = await getTranslations("analytics")

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("activeEmployees")} value={a.totalActive} hint={t("totalRegistered", { count: headcount })} />
        <StatCard label={t("presentToday")} value={a.presentToday} hint={t("ofActive", { rate: attendanceRate })} />
        <StatCard label={t("onLeaveToday")} value={a.onLeaveToday} />
        <StatCard label={t("pendingApprovals")} value={a.pendingApprovals} hint={t("leaveOvertimeHint")} />
        <StatCard label={t("newHires")} value={a.newHiresThisMonth} />
        <StatCard label={t("inactive")} value={a.totalInactive} />
        <StatCard label={t("avgKpi")} value={a.avgKpiScore ?? "—"} hint={t("avgKpiHint")} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <BreakdownCard title={t("byDepartment")} rows={a.byDepartment} emptyLabel={t("emptyData")} />
        <BreakdownCard title={t("byContractType")} rows={a.byContractType} emptyLabel={t("emptyData")} />
        <BreakdownCard title={t("byGender")} rows={a.byGender} emptyLabel={t("emptyData")} />
      </div>
    </div>
  )
}
