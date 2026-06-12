import Link from "next/link"
import { redirect, notFound } from "next/navigation"
import { auth, hasRole } from "@/lib/auth"
import { isModuleActive } from "@/lib/modules"
import { ModuleLocked } from "@/components/module-locked"
import { getPeriod, listObjectives, listActivationStates } from "@/modules/kpi/queries"
import { activationProblems } from "@/modules/kpi/validation"
import {
  PERIOD_STATUS_LABEL,
  PERIOD_STATUS_STYLE,
  type PeriodStatus,
} from "@/modules/kpi/schema"
import ObjectivesPanel from "./_objectives"
import PeriodActions from "./_period-actions"

interface Props {
  params: Promise<{ id: string }>
}

export default async function PeriodDetailPage({ params }: Props) {
  const session = await auth()
  if (!session) redirect("/login")
  const tenantId = session.user.tenantId
  if (!hasRole(session.user.roles, "hr_admin") || !tenantId) {
    redirect("/dashboard")
  }
  if (!(await isModuleActive(tenantId, "MODULE_2"))) {
    return <ModuleLocked moduleCode="MODULE_2" />
  }

  const { id } = await params
  const period = await getPeriod(tenantId, id)
  if (!period) notFound()

  const objectives = await listObjectives(tenantId, id)
  const isPlanning = period.status === "planning"
  const readiness = isPlanning ? activationProblems(await listActivationStates(tenantId, id)) : []

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard/kpi/periods" className="text-sm text-primary hover:underline">
          ← Periode KPI
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{period.name}</h1>
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PERIOD_STATUS_STYLE[period.status as PeriodStatus]}`}>
            {PERIOD_STATUS_LABEL[period.status as PeriodStatus]}
          </span>
        </div>
      </div>

      <section className="space-y-3 rounded-xl border p-4">
        <h2 className="text-sm font-semibold">Target Perusahaan (referensi)</h2>
        <ObjectivesPanel
          periodId={period.id}
          editable={isPlanning}
          objectives={objectives.map((o) => ({ id: o.id, title: o.title, description: o.description }))}
        />
      </section>

      {isPlanning && (
        <section className="space-y-2 rounded-xl border p-4">
          <h2 className="text-sm font-semibold">Kesiapan Aktivasi</h2>
          {readiness.length === 0 ? (
            <p className="text-sm text-emerald-600">✓ Siap diaktifkan — semua scorecard wajib lengkap & disetujui.</p>
          ) : (
            <ul className="list-inside list-disc text-sm text-amber-700">
              {readiness.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          )}
        </section>
      )}

      <section className="space-y-3 rounded-xl border p-4">
        <h2 className="text-sm font-semibold">Aksi Periode</h2>
        <PeriodActions periodId={period.id} status={period.status} />
      </section>
    </div>
  )
}
