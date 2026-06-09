import Link from "next/link"
import { redirect } from "next/navigation"
import { auth, hasRole } from "@/lib/auth"
import { isModuleActive } from "@/lib/modules"
import { ModuleLocked } from "@/components/module-locked"
import { listPeriods } from "@/modules/kpi/queries"
import {
  PERIOD_STATUS_LABEL,
  PERIOD_STATUS_STYLE,
  PERIOD_TYPE_OPTIONS,
  type PeriodStatus,
} from "@/modules/kpi/schema"
import PeriodCreateForm from "./_create-form"

function dateLabel(d: Date): string {
  return new Date(d).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

const TYPE_LABEL = Object.fromEntries(PERIOD_TYPE_OPTIONS.map((o) => [o.value, o.label]))

export default async function KpiPeriodsPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const tenantId = session.user.tenantId
  if (!hasRole(session.user.roles, "hr_admin") || !tenantId) {
    redirect("/dashboard")
  }
  if (!(await isModuleActive(tenantId, "MODULE_2"))) {
    return <ModuleLocked moduleCode="MODULE_2" />
  }

  const periods = await listPeriods(tenantId)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Periode KPI</h1>
        <p className="text-sm text-muted-foreground">
          Atur siklus penilaian, target perusahaan, dan aktivasi periode.
        </p>
      </div>

      <PeriodCreateForm />

      <div className="overflow-hidden rounded-xl border">
        <table className="min-w-full divide-y">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Periode</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Rentang</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Status</th>
              <th className="px-4 py-2 text-right text-xs font-medium uppercase text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {periods.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Belum ada periode.
                </td>
              </tr>
            ) : (
              periods.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2 text-sm">
                    <Link href={`/dashboard/kpi/periods/${p.id}`} className="font-medium hover:underline">
                      {p.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">{TYPE_LABEL[p.type] ?? p.type}</div>
                  </td>
                  <td className="px-4 py-2 text-sm text-muted-foreground">
                    {dateLabel(p.startDate)} – {dateLabel(p.endDate)}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PERIOD_STATUS_STYLE[p.status as PeriodStatus]}`}>
                      {PERIOD_STATUS_LABEL[p.status as PeriodStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link href={`/dashboard/kpi/periods/${p.id}`} className="text-sm text-primary hover:underline">
                      Kelola →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
