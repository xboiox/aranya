"use server"
import { auth, hasRole } from "@/lib/auth"
import { withTenantContext } from "@/lib/db"
import {
  attendance,
  geofenceLocations,
  tenantConfig,
  GEOFENCING_ENABLED_KEY,
} from "@/lib/db/schema"
import { logAudit } from "@/lib/audit"
import { coordsSchema, geofenceLocationSchema, type CoordsInput } from "./schema"
import { evaluateAttendance } from "./geofence"
import { getEmployeeIdByUser, getGeofenceConfig, todayJakarta } from "./queries"
import { eq, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"

type State = { error?: string; success?: string }

async function resolveEmployee(): Promise<
  | { error: string }
  | { tenantId: string; employeeId: string; userId: string }
> {
  const session = await auth()
  if (!session) return { error: "Tidak terautentikasi" }
  const tenantId = session.user.tenantId
  if (!tenantId) return { error: "Akun tidak terhubung ke perusahaan" }
  const employeeId = await getEmployeeIdByUser(tenantId, session.user.id)
  if (!employeeId) return { error: "Data karyawan tidak ditemukan" }
  return { tenantId, employeeId, userId: session.user.id }
}

export async function checkIn(input: CoordsInput): Promise<State> {
  const parsed = coordsSchema.safeParse(input)
  if (!parsed.success) return { error: "Lokasi GPS tidak valid" }
  const { latitude, longitude, accuracy, isWfh } = parsed.data

  const ctx = await resolveEmployee()
  if ("error" in ctx) return { error: ctx.error }

  const config = await getGeofenceConfig(ctx.tenantId)
  const geo = evaluateAttendance({
    isWfh,
    latitude,
    longitude,
    accuracy,
    geofencingEnabled: config.enabled,
    locations: config.locations,
  })
  if (geo.blocked) return { error: geo.reason ?? "Absensi ditolak" }

  const result = await withTenantContext(ctx.tenantId, async (tx) => {
    const existing = await tx.query.attendance.findFirst({
      where: and(
        eq(attendance.employeeId, ctx.employeeId),
        eq(attendance.date, todayJakarta()),
      ),
    })
    if (existing?.checkInAt) return { error: "Anda sudah check-in hari ini" as string }

    await tx.insert(attendance).values({
      tenantId: ctx.tenantId,
      employeeId: ctx.employeeId,
      date: todayJakarta(),
      checkInAt: new Date(),
      checkInLat: latitude,
      checkInLng: longitude,
      checkInAccuracy: accuracy,
      checkInWfh: isWfh,
      checkInWithinGeofence: geo.within,
    })
    return { ok: true }
  })

  if ("error" in result) return { error: result.error }

  await logAudit({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: "attendance.check_in",
    entityType: "attendance",
    newValues: { isWfh, within: geo.within },
  })

  revalidatePath("/dashboard/attendance")
  return { success: "Check-in berhasil" }
}

export async function checkOut(input: CoordsInput): Promise<State> {
  const parsed = coordsSchema.safeParse(input)
  if (!parsed.success) return { error: "Lokasi GPS tidak valid" }
  const { latitude, longitude, accuracy, isWfh } = parsed.data

  const ctx = await resolveEmployee()
  if ("error" in ctx) return { error: ctx.error }

  const config = await getGeofenceConfig(ctx.tenantId)
  const geo = evaluateAttendance({
    isWfh,
    latitude,
    longitude,
    accuracy,
    geofencingEnabled: config.enabled,
    locations: config.locations,
  })
  if (geo.blocked) return { error: geo.reason ?? "Absensi ditolak" }

  const result = await withTenantContext(ctx.tenantId, async (tx) => {
    const existing = await tx.query.attendance.findFirst({
      where: and(
        eq(attendance.employeeId, ctx.employeeId),
        eq(attendance.date, todayJakarta()),
      ),
    })
    if (!existing?.checkInAt) return { error: "Anda belum check-in hari ini" as string }
    if (existing.checkOutAt) return { error: "Anda sudah check-out hari ini" }

    await tx
      .update(attendance)
      .set({
        checkOutAt: new Date(),
        checkOutLat: latitude,
        checkOutLng: longitude,
        checkOutAccuracy: accuracy,
        checkOutWfh: isWfh,
        checkOutWithinGeofence: geo.within,
        updatedAt: new Date(),
      })
      .where(eq(attendance.id, existing.id))
    return { ok: true }
  })

  if ("error" in result) return { error: result.error }

  await logAudit({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: "attendance.check_out",
    entityType: "attendance",
    newValues: { isWfh, within: geo.within },
  })

  revalidatePath("/dashboard/attendance")
  return { success: "Check-out berhasil" }
}

// ── HR: Geofence configuration ───────────────────────────────────────────────

async function requireHrAdmin(): Promise<
  { error: string } | { tenantId: string; userId: string }
> {
  const session = await auth()
  if (!session) return { error: "Tidak terautentikasi" }
  if (!hasRole(session.user.roles, "hr_admin") || !session.user.tenantId) {
    return { error: "Hanya HR Admin yang dapat mengubah pengaturan absensi" }
  }
  return { tenantId: session.user.tenantId, userId: session.user.id }
}

export async function updateGeofencing(_prev: State, formData: FormData): Promise<State> {
  const ctx = await requireHrAdmin()
  if ("error" in ctx) return { error: ctx.error }
  const enabled = formData.get("enabled") === "on"

  await withTenantContext(ctx.tenantId, async (tx) => {
    await tx
      .insert(tenantConfig)
      .values({ tenantId: ctx.tenantId, key: GEOFENCING_ENABLED_KEY, value: enabled ? "true" : "false" })
      .onConflictDoUpdate({
        target: [tenantConfig.tenantId, tenantConfig.key],
        set: { value: enabled ? "true" : "false", updatedAt: new Date() },
      })
  })

  await logAudit({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: "attendance.geofencing_toggle",
    newValues: { enabled },
  })

  revalidatePath("/dashboard/attendance/settings")
  return { success: `Geofencing ${enabled ? "diaktifkan" : "dinonaktifkan"}` }
}

export async function addGeofenceLocation(_prev: State, formData: FormData): Promise<State> {
  const ctx = await requireHrAdmin()
  if ("error" in ctx) return { error: ctx.error }

  const parsed = geofenceLocationSchema.safeParse({
    name: formData.get("name"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
    radiusMeters: formData.get("radiusMeters"),
  })
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  await withTenantContext(ctx.tenantId, async (tx) => {
    await tx.insert(geofenceLocations).values({
      tenantId: ctx.tenantId,
      name: parsed.data.name,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      radiusMeters: parsed.data.radiusMeters,
    })
  })

  await logAudit({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: "attendance.geofence_add",
    newValues: { name: parsed.data.name },
  })

  revalidatePath("/dashboard/attendance/settings")
  return { success: "Lokasi geofence ditambahkan" }
}

export async function removeGeofenceLocation(id: string): Promise<State> {
  const ctx = await requireHrAdmin()
  if ("error" in ctx) return { error: ctx.error }

  await withTenantContext(ctx.tenantId, async (tx) => {
    await tx
      .delete(geofenceLocations)
      .where(
        and(eq(geofenceLocations.id, id), eq(geofenceLocations.tenantId, ctx.tenantId)),
      )
  })

  revalidatePath("/dashboard/attendance/settings")
  return { success: "Lokasi geofence dihapus" }
}
