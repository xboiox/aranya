import { withTenantContext } from "@/lib/db"
import {
  employees,
  leaveRequests,
  overtimeRequests,
  attendance,
  kpiEvaluations,
} from "@/lib/db/schema"
import { todayJakarta } from "@/lib/date"
import { and, eq, gte, lte, isNotNull, count, avg } from "drizzle-orm"
import { GENDER_LABEL, toBreakdown, type Breakdown } from "./transform"

export type { Breakdown }

export interface HrAnalytics {
  totalActive: number
  totalInactive: number
  newHiresThisMonth: number
  presentToday: number
  onLeaveToday: number
  pendingApprovals: number
  avgKpiScore: number | null
  byDepartment: Breakdown[]
  byContractType: Breakdown[]
  byGender: Breakdown[]
}

export async function getHrAnalytics(tenantId: string): Promise<HrAnalytics> {
  const today = todayJakarta()
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))

  return withTenantContext(tenantId, async (tx) => {
    const [
      activeRow,
      inactiveRow,
      newHiresRow,
      presentRow,
      onLeaveRow,
      leavePendingRow,
      overtimePendingRow,
      kpiPendingRow,
      avgKpiRow,
      deptRows,
      contractRows,
      genderRows,
    ] = await Promise.all([
      tx.select({ value: count() }).from(employees).where(eq(employees.isActive, true)),
      tx.select({ value: count() }).from(employees).where(eq(employees.isActive, false)),
      tx
        .select({ value: count() })
        .from(employees)
        .where(and(eq(employees.isActive, true), gte(employees.joinDate, monthStart))),
      tx
        .select({ value: count() })
        .from(attendance)
        .where(and(eq(attendance.date, today), isNotNull(attendance.checkInAt))),
      tx
        .select({ value: count() })
        .from(leaveRequests)
        .where(
          and(
            eq(leaveRequests.status, "approved"),
            lte(leaveRequests.startDate, today),
            gte(leaveRequests.endDate, today),
          ),
        ),
      tx.select({ value: count() }).from(leaveRequests).where(eq(leaveRequests.status, "pending")),
      tx
        .select({ value: count() })
        .from(overtimeRequests)
        .where(eq(overtimeRequests.status, "pending")),
      tx
        .select({ value: count() })
        .from(kpiEvaluations)
        .where(eq(kpiEvaluations.status, "pending")),
      tx
        .select({ value: avg(kpiEvaluations.score) })
        .from(kpiEvaluations)
        .where(eq(kpiEvaluations.status, "approved")),
      tx
        .select({ key: employees.department, value: count() })
        .from(employees)
        .where(eq(employees.isActive, true))
        .groupBy(employees.department),
      tx
        .select({ key: employees.contractType, value: count() })
        .from(employees)
        .where(eq(employees.isActive, true))
        .groupBy(employees.contractType),
      tx
        .select({ key: employees.gender, value: count() })
        .from(employees)
        .where(eq(employees.isActive, true))
        .groupBy(employees.gender),
    ])

    const avgRaw = avgKpiRow[0]?.value
    const avgKpiScore = avgRaw == null ? null : Math.round(Number(avgRaw) * 10) / 10

    return {
      totalActive: Number(activeRow[0]?.value ?? 0),
      totalInactive: Number(inactiveRow[0]?.value ?? 0),
      newHiresThisMonth: Number(newHiresRow[0]?.value ?? 0),
      presentToday: Number(presentRow[0]?.value ?? 0),
      onLeaveToday: Number(onLeaveRow[0]?.value ?? 0),
      pendingApprovals:
        Number(leavePendingRow[0]?.value ?? 0) +
        Number(overtimePendingRow[0]?.value ?? 0) +
        Number(kpiPendingRow[0]?.value ?? 0),
      avgKpiScore,
      byDepartment: toBreakdown(deptRows),
      byContractType: toBreakdown(contractRows),
      byGender: toBreakdown(genderRows, GENDER_LABEL),
    }
  })
}
