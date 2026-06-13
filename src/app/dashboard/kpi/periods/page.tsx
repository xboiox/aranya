import Link from "next/link"
import { redirect } from "next/navigation"
import { auth, hasRole } from "@/lib/auth"
import { isModuleActive } from "@/lib/modules"
import { ModuleLocked } from "@/components/module-locked"
import { listPeriods } from "@/modules/kpi/queries"
import {
  PERIOD_STATUS_LABEL,
  PERIOD_TYPE_OPTIONS,
  type PeriodStatus,
} from "@/modules/kpi/schema"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { periodStatusVariant } from "@/lib/status"
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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Periode</TableHead>
            <TableHead>Rentang</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {periods.length === 0 ? (
            <TableEmpty colSpan={4}>Belum ada periode.</TableEmpty>
          ) : (
            periods.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <Link href={`/dashboard/kpi/periods/${p.id}`} className="font-medium hover:underline">
                    {p.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">{TYPE_LABEL[p.type] ?? p.type}</div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {dateLabel(p.startDate)} – {dateLabel(p.endDate)}
                </TableCell>
                <TableCell>
                  <Badge variant={periodStatusVariant(p.status)}>
                    {PERIOD_STATUS_LABEL[p.status as PeriodStatus]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/dashboard/kpi/periods/${p.id}`} className="text-sm text-primary hover:underline">
                    Kelola →
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
