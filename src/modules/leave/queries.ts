import { withTenantContext } from "@/lib/db"
import {
  leaveRequests,
  employees,
  users,
  tenantConfig,
  ANNUAL_LEAVE_QUOTA_KEY,
  DEFAULT_ANNUAL_QUOTA,
} from "@/lib/db/schema"
import { eq, and, desc, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"

export type LeaveRequestRow = typeof leaveRequests.$inferSelect

export async function listMyLeaveRequests(
  tenantId: string,
  employeeId: string,
): Promise<LeaveRequestRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    return tx
      .select()
      .from(leaveRequests)
      .where(eq(leaveRequests.employeeId, employeeId))
      .orderBy(desc(leaveRequests.createdAt))
  })
}

export async function getLeaveBalanceQuota(tenantId: string): Promise<number> {
  return withTenantContext(tenantId, async (tx) => {
    const cfg = await tx.query.tenantConfig.findFirst({
      where: and(
        eq(tenantConfig.tenantId, tenantId),
        eq(tenantConfig.key, ANNUAL_LEAVE_QUOTA_KEY),
      ),
    })
    return cfg ? parseInt(cfg.value, 10) || DEFAULT_ANNUAL_QUOTA : DEFAULT_ANNUAL_QUOTA
  })
}

export interface LeaveBalance {
  quota: number
  used: number
  remaining: number
}

export async function getLeaveBalance(
  tenantId: string,
  employeeId: string,
  year: number = new Date().getUTCFullYear(),
): Promise<LeaveBalance> {
  return withTenantContext(tenantId, async (tx) => {
    const cfg = await tx.query.tenantConfig.findFirst({
      where: and(
        eq(tenantConfig.tenantId, tenantId),
        eq(tenantConfig.key, ANNUAL_LEAVE_QUOTA_KEY),
      ),
    })
    const quota = cfg ? parseInt(cfg.value, 10) || DEFAULT_ANNUAL_QUOTA : DEFAULT_ANNUAL_QUOTA

    const [row] = await tx
      .select({ used: sql<number>`coalesce(sum(${leaveRequests.totalDays}), 0)::int` })
      .from(leaveRequests)
      .where(
        and(
          eq(leaveRequests.employeeId, employeeId),
          eq(leaveRequests.type, "annual"),
          eq(leaveRequests.status, "approved"),
          sql`extract(year from ${leaveRequests.startDate}) = ${year}`,
        ),
      )

    const used = row?.used ?? 0
    return { quota, used, remaining: Math.max(0, quota - used) }
  })
}

export interface PendingApproval {
  id: string
  requesterName: string | null
  type: string
  startDate: Date
  endDate: Date
  totalDays: number
  reason: string | null
  createdAt: Date
}

// Pending approvals: HR Admin → semua pending di tenant;
// Manager → hanya pending dari bawahan langsung (reports_to == approverEmployeeId)
export async function listPendingApprovals(
  tenantId: string,
  approverEmployeeId: string,
  isHrAdmin: boolean,
): Promise<PendingApproval[]> {
  return withTenantContext(tenantId, async (tx) => {
    const requester = alias(employees, "requester")
    const requesterUser = alias(users, "requester_user")

    const base = tx
      .select({
        id: leaveRequests.id,
        requesterName: requesterUser.name,
        type: leaveRequests.type,
        startDate: leaveRequests.startDate,
        endDate: leaveRequests.endDate,
        totalDays: leaveRequests.totalDays,
        reason: leaveRequests.reason,
        createdAt: leaveRequests.createdAt,
      })
      .from(leaveRequests)
      .innerJoin(requester, eq(requester.id, leaveRequests.employeeId))
      .innerJoin(requesterUser, eq(requesterUser.id, requester.userId))
      .orderBy(desc(leaveRequests.createdAt))

    if (isHrAdmin) {
      return base.where(eq(leaveRequests.status, "pending"))
    }
    return base.where(
      and(
        eq(leaveRequests.status, "pending"),
        eq(requester.reportsToId, approverEmployeeId),
      ),
    )
  })
}
