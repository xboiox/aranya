import { withTenantContext } from "@/lib/db"
import { kpiEvaluations, employees, users } from "@/lib/db/schema"
import { eq, and, desc } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"

export type KpiRow = typeof kpiEvaluations.$inferSelect

export async function listMyKpi(
  tenantId: string,
  employeeId: string,
): Promise<KpiRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    return tx
      .select()
      .from(kpiEvaluations)
      .where(eq(kpiEvaluations.employeeId, employeeId))
      .orderBy(desc(kpiEvaluations.createdAt))
  })
}

export interface PendingKpi {
  id: string
  requesterName: string | null
  period: string
  score: number
  notes: string | null
}

export async function listPendingKpiApprovals(
  tenantId: string,
  approverEmployeeId: string,
  isHrAdmin: boolean,
): Promise<PendingKpi[]> {
  return withTenantContext(tenantId, async (tx) => {
    const requester = alias(employees, "requester")
    const requesterUser = alias(users, "requester_user")

    const base = tx
      .select({
        id: kpiEvaluations.id,
        requesterName: requesterUser.name,
        period: kpiEvaluations.period,
        score: kpiEvaluations.score,
        notes: kpiEvaluations.notes,
      })
      .from(kpiEvaluations)
      .innerJoin(requester, eq(requester.id, kpiEvaluations.employeeId))
      .innerJoin(requesterUser, eq(requesterUser.id, requester.userId))
      .orderBy(desc(kpiEvaluations.createdAt))

    if (isHrAdmin) {
      return base.where(eq(kpiEvaluations.status, "pending"))
    }
    return base.where(
      and(
        eq(kpiEvaluations.status, "pending"),
        eq(requester.reportsToId, approverEmployeeId),
      ),
    )
  })
}
