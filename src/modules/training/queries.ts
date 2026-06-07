import { withTenantContext } from "@/lib/db"
import { trainingRecords, employees, users } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"

export type TrainingRow = typeof trainingRecords.$inferSelect

export async function listMyTraining(
  tenantId: string,
  employeeId: string,
): Promise<TrainingRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    return tx
      .select()
      .from(trainingRecords)
      .where(eq(trainingRecords.employeeId, employeeId))
      .orderBy(desc(trainingRecords.createdAt))
  })
}

export interface TrainingAdminRow extends TrainingRow {
  employeeName: string | null
}

export async function listAllTraining(tenantId: string): Promise<TrainingAdminRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    return tx
      .select({
        id: trainingRecords.id,
        tenantId: trainingRecords.tenantId,
        employeeId: trainingRecords.employeeId,
        title: trainingRecords.title,
        type: trainingRecords.type,
        provider: trainingRecords.provider,
        startDate: trainingRecords.startDate,
        completionDate: trainingRecords.completionDate,
        expiryDate: trainingRecords.expiryDate,
        status: trainingRecords.status,
        notes: trainingRecords.notes,
        createdAt: trainingRecords.createdAt,
        employeeName: users.name,
      })
      .from(trainingRecords)
      .innerJoin(employees, eq(employees.id, trainingRecords.employeeId))
      .innerJoin(users, eq(users.id, employees.userId))
      .orderBy(desc(trainingRecords.createdAt))
  })
}
