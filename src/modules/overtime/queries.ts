import { withTenantContext } from "@/lib/db"
import { overtimeRequests, employees, users } from "@/lib/db/schema"
import { eq, and, desc, inArray } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"

export type OvertimeRow = typeof overtimeRequests.$inferSelect

export async function listMyOvertime(
  tenantId: string,
  employeeId: string,
): Promise<OvertimeRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    return tx
      .select()
      .from(overtimeRequests)
      .where(eq(overtimeRequests.employeeId, employeeId))
      .orderBy(desc(overtimeRequests.createdAt))
  })
}

export interface PendingOvertime {
  id: string
  requesterName: string | null
  date: Date
  startTime: string
  endTime: string
  durationMinutes: number
  reason: string | null
}

export async function listPendingOvertimeApprovals(
  tenantId: string,
  approverEmployeeId: string,
  isHrAdmin: boolean,
): Promise<PendingOvertime[]> {
  return withTenantContext(tenantId, async (tx) => {
    const requester = alias(employees, "requester")
    const requesterUser = alias(users, "requester_user")

    const base = tx
      .select({
        id: overtimeRequests.id,
        requesterName: requesterUser.name,
        date: overtimeRequests.date,
        startTime: overtimeRequests.startTime,
        endTime: overtimeRequests.endTime,
        durationMinutes: overtimeRequests.durationMinutes,
        reason: overtimeRequests.reason,
      })
      .from(overtimeRequests)
      .innerJoin(requester, eq(requester.id, overtimeRequests.employeeId))
      .innerJoin(requesterUser, eq(requesterUser.id, requester.userId))
      .orderBy(desc(overtimeRequests.createdAt))

    if (isHrAdmin) {
      return base.where(eq(overtimeRequests.status, "pending"))
    }
    return base.where(
      and(
        eq(overtimeRequests.status, "pending"),
        eq(requester.reportsToId, approverEmployeeId),
      ),
    )
  })
}

export interface DecidedOvertime extends PendingOvertime {
  status: string
  decidedAt: Date | null
  rejectionReason: string | null
  approverName: string | null
}

// Riwayat approval lembur (disetujui/ditolak) dalam cakupan approver yang sama.
export async function listDecidedOvertimeApprovals(
  tenantId: string,
  approverEmployeeId: string,
  isHrAdmin: boolean,
  limit = 50,
): Promise<DecidedOvertime[]> {
  return withTenantContext(tenantId, async (tx) => {
    const requester = alias(employees, "requester")
    const requesterUser = alias(users, "requester_user")
    const approverUser = alias(users, "approver_user")

    const base = tx
      .select({
        id: overtimeRequests.id,
        requesterName: requesterUser.name,
        date: overtimeRequests.date,
        startTime: overtimeRequests.startTime,
        endTime: overtimeRequests.endTime,
        durationMinutes: overtimeRequests.durationMinutes,
        reason: overtimeRequests.reason,
        status: overtimeRequests.status,
        decidedAt: overtimeRequests.decidedAt,
        rejectionReason: overtimeRequests.rejectionReason,
        approverName: approverUser.name,
      })
      .from(overtimeRequests)
      .innerJoin(requester, eq(requester.id, overtimeRequests.employeeId))
      .innerJoin(requesterUser, eq(requesterUser.id, requester.userId))
      .leftJoin(approverUser, eq(approverUser.id, overtimeRequests.approverId))
      .orderBy(desc(overtimeRequests.decidedAt))
      .limit(limit)

    const decided = inArray(overtimeRequests.status, ["approved", "rejected"])
    if (isHrAdmin) {
      return base.where(decided)
    }
    return base.where(and(decided, eq(requester.reportsToId, approverEmployeeId)))
  })
}
