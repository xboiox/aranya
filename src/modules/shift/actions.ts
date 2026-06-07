"use server"
import { auth, hasRole } from "@/lib/auth"
import { withTenantContext } from "@/lib/db"
import { shifts } from "@/lib/db/schema"
import { logAudit } from "@/lib/audit"
import { eq, and } from "drizzle-orm"
import { z } from "zod"
import { revalidatePath } from "next/cache"

type State = { error?: string; success?: string }

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/

const shiftSchema = z.object({
  name: z.string().trim().min(2, "Nama shift minimal 2 karakter"),
  startTime: z.string().regex(timeRegex, "Jam mulai harus HH:MM"),
  endTime: z.string().regex(timeRegex, "Jam selesai harus HH:MM"),
  lateToleranceMinutes: z.coerce.number().int().min(0).max(120),
})

async function requireHr() {
  const session = await auth()
  if (!session) return { error: "Tidak terautentikasi" as const }
  if (!hasRole(session.user.roles, "hr_admin") || !session.user.tenantId) {
    return { error: "Hanya HR Admin yang dapat mengelola shift" as const }
  }
  return { tenantId: session.user.tenantId, userId: session.user.id }
}

export async function createShift(_prev: State, formData: FormData): Promise<State> {
  const ctx = await requireHr()
  if ("error" in ctx) return { error: ctx.error }

  const parsed = shiftSchema.safeParse({
    name: formData.get("name"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    lateToleranceMinutes: formData.get("lateToleranceMinutes") ?? 0,
  })
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  await withTenantContext(ctx.tenantId, async (tx) => {
    await tx.insert(shifts).values({ tenantId: ctx.tenantId, ...parsed.data })
  })

  await logAudit({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: "shift.create",
    newValues: { name: parsed.data.name },
  })

  revalidatePath("/dashboard/attendance/shifts")
  return { success: "Shift ditambahkan" }
}

export async function deleteShift(id: string): Promise<State> {
  const ctx = await requireHr()
  if ("error" in ctx) return { error: ctx.error }

  await withTenantContext(ctx.tenantId, async (tx) => {
    await tx.delete(shifts).where(and(eq(shifts.id, id), eq(shifts.tenantId, ctx.tenantId)))
  })

  await logAudit({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: "shift.delete",
    entityType: "shift",
    entityId: id,
  })

  revalidatePath("/dashboard/attendance/shifts")
  return { success: "Shift dihapus" }
}
