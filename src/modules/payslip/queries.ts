import { withTenantContext } from "@/lib/db"
import { payslips, employees, users } from "@/lib/db/schema"
import { eq, and, desc } from "drizzle-orm"

export interface MyPayslip {
  id: string
  year: number
  month: number
  fileName: string
}

export async function listMyPayslips(
  tenantId: string,
  employeeId: string,
): Promise<MyPayslip[]> {
  return withTenantContext(tenantId, async (tx) => {
    return tx
      .select({
        id: payslips.id,
        year: payslips.year,
        month: payslips.month,
        fileName: payslips.fileName,
      })
      .from(payslips)
      .where(eq(payslips.employeeId, employeeId))
      .orderBy(desc(payslips.year), desc(payslips.month))
  })
}

export interface PayslipAdminRow {
  id: string
  employeeName: string | null
  year: number
  month: number
  fileName: string
}

export async function listAllPayslips(tenantId: string): Promise<PayslipAdminRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    return tx
      .select({
        id: payslips.id,
        employeeName: users.name,
        year: payslips.year,
        month: payslips.month,
        fileName: payslips.fileName,
      })
      .from(payslips)
      .innerJoin(employees, eq(employees.id, payslips.employeeId))
      .innerJoin(users, eq(users.id, employees.userId))
      .orderBy(desc(payslips.year), desc(payslips.month))
  })
}

// Untuk route download: ambil payslip + verifikasi kepemilikan
export async function getPayslipForDownload(
  tenantId: string,
  payslipId: string,
): Promise<{
  storagePath: string
  fileName: string
  employeeUserId: string
} | null> {
  return withTenantContext(tenantId, async (tx) => {
    const [row] = await tx
      .select({
        storagePath: payslips.storagePath,
        fileName: payslips.fileName,
        employeeUserId: employees.userId,
      })
      .from(payslips)
      .innerJoin(employees, eq(employees.id, payslips.employeeId))
      .where(and(eq(payslips.id, payslipId), eq(payslips.tenantId, tenantId)))
      .limit(1)
    return row ?? null
  })
}

// Daftar karyawan untuk dropdown upload
export async function listEmployeeOptions(
  tenantId: string,
): Promise<{ id: string; name: string | null }[]> {
  return withTenantContext(tenantId, async (tx) => {
    return tx
      .select({ id: employees.id, name: users.name })
      .from(employees)
      .innerJoin(users, eq(users.id, employees.userId))
      .where(eq(employees.isActive, true))
  })
}
