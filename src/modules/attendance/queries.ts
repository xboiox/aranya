import { withTenantContext } from "@/lib/db"
import {
  employees,
  attendance,
  users,
  geofenceLocations,
  tenantConfig,
  GEOFENCING_ENABLED_KEY,
} from "@/lib/db/schema"
import { eq, and, desc, asc, gte, lte } from "drizzle-orm"
import { todayJakarta } from "@/lib/date"
import { buildTeamGrid, eachDateInRange } from "./team-report"

// Re-export agar import lama (./queries) tetap berfungsi
export { todayJakarta }

export async function getEmployeeIdByUser(
  tenantId: string,
  userId: string,
): Promise<string | null> {
  return withTenantContext(tenantId, async (tx) => {
    const emp = await tx.query.employees.findFirst({
      where: eq(employees.userId, userId),
    })
    return emp?.id ?? null
  })
}

export interface GeofenceConfig {
  enabled: boolean
  locations: {
    id: string
    name: string
    latitude: number
    longitude: number
    radiusMeters: number
  }[]
}

export async function getGeofenceConfig(tenantId: string): Promise<GeofenceConfig> {
  return withTenantContext(tenantId, async (tx) => {
    const cfg = await tx.query.tenantConfig.findFirst({
      where: and(
        eq(tenantConfig.tenantId, tenantId),
        eq(tenantConfig.key, GEOFENCING_ENABLED_KEY),
      ),
    })
    const locations = await tx
      .select({
        id: geofenceLocations.id,
        name: geofenceLocations.name,
        latitude: geofenceLocations.latitude,
        longitude: geofenceLocations.longitude,
        radiusMeters: geofenceLocations.radiusMeters,
      })
      .from(geofenceLocations)
      .where(
        and(
          eq(geofenceLocations.tenantId, tenantId),
          eq(geofenceLocations.isActive, true),
        ),
      )
    return { enabled: cfg?.value === "true", locations }
  })
}

export type TodayAttendance = typeof attendance.$inferSelect

export async function getTodayAttendance(
  tenantId: string,
  employeeId: string,
): Promise<TodayAttendance | null> {
  return withTenantContext(tenantId, async (tx) => {
    const row = await tx.query.attendance.findFirst({
      where: and(
        eq(attendance.employeeId, employeeId),
        eq(attendance.date, todayJakarta()),
      ),
    })
    return row ?? null
  })
}

export async function listRecentAttendance(
  tenantId: string,
  employeeId: string,
  limit = 14,
): Promise<TodayAttendance[]> {
  return withTenantContext(tenantId, async (tx) => {
    return tx
      .select()
      .from(attendance)
      .where(eq(attendance.employeeId, employeeId))
      .orderBy(desc(attendance.date))
      .limit(limit)
  })
}

export interface TeamAttendanceRow {
  employeeId: string
  name: string | null
  department: string | null
  date: Date
  checkInAt: Date | null
  checkOutAt: Date | null
  isLate: boolean | null
}

export interface TeamAttendanceFilter {
  startDate: Date
  endDate: Date
  department?: string
}

// Grid absensi karyawan aktif untuk rentang tanggal (untuk HR).
// Opsional difilter per departemen. Satu baris per (karyawan × tanggal).
export async function listTeamAttendanceRange(
  tenantId: string,
  { startDate, endDate, department }: TeamAttendanceFilter,
): Promise<TeamAttendanceRow[]> {
  return withTenantContext(tenantId, async (tx) => {
    const emps = await tx
      .select({
        employeeId: employees.id,
        name: users.name,
        department: employees.department,
      })
      .from(employees)
      .innerJoin(users, eq(users.id, employees.userId))
      .where(
        department
          ? and(eq(employees.isActive, true), eq(employees.department, department))
          : eq(employees.isActive, true),
      )
      .orderBy(asc(users.name))

    const records = await tx
      .select({
        employeeId: attendance.employeeId,
        date: attendance.date,
        checkInAt: attendance.checkInAt,
        checkOutAt: attendance.checkOutAt,
        isLate: attendance.isLate,
      })
      .from(attendance)
      .where(
        and(gte(attendance.date, startDate), lte(attendance.date, endDate)),
      )

    return buildTeamGrid(emps, records, eachDateInRange(startDate, endDate))
  })
}

// Daftar departemen unik karyawan aktif (untuk filter dropdown).
export async function listDepartments(tenantId: string): Promise<string[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .selectDistinct({ department: employees.department })
      .from(employees)
      .where(eq(employees.isActive, true))
      .orderBy(asc(employees.department))
    return rows
      .map((r) => r.department)
      .filter((d): d is string => d != null && d.trim() !== "")
  })
}
