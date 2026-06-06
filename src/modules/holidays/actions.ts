"use server"
import { auth, hasRole } from "@/lib/auth"
import { withTenantContext } from "@/lib/db"
import { holidays } from "@/lib/db/schema"
import { logAudit } from "@/lib/audit"
import { parseDateOnly } from "@/lib/date"
import { eq, and } from "drizzle-orm"
import { z } from "zod"
import { revalidatePath } from "next/cache"

type State = { error?: string; success?: string }

const holidaySchema = z.object({
  name: z.string().trim().min(2, "Nama hari libur minimal 2 karakter"),
  date: z.string().min(1, "Tanggal wajib diisi"),
  isRecurring: z.boolean().optional().default(false),
})

async function requireHr() {
  const session = await auth()
  if (!session) return { error: "Tidak terautentikasi" as const }
  if (!hasRole(session.user.roles, "hr_admin") || !session.user.tenantId) {
    return { error: "Hanya HR Admin yang dapat mengelola hari libur" as const }
  }
  return { tenantId: session.user.tenantId, userId: session.user.id }
}

export async function addHoliday(_prev: State, formData: FormData): Promise<State> {
  const ctx = await requireHr()
  if ("error" in ctx) return { error: ctx.error }

  const parsed = holidaySchema.safeParse({
    name: formData.get("name"),
    date: formData.get("date"),
    isRecurring: formData.get("isRecurring") === "on",
  })
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const date = parseDateOnly(parsed.data.date)
  if (!date) return { error: "Tanggal tidak valid" }

  await withTenantContext(ctx.tenantId, async (tx) => {
    await tx.insert(holidays).values({
      tenantId: ctx.tenantId,
      name: parsed.data.name,
      date,
      isRecurring: parsed.data.isRecurring,
    })
  })

  await logAudit({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: "holiday.add",
    newValues: { name: parsed.data.name, date: parsed.data.date },
  })

  revalidatePath("/dashboard/leave/settings")
  return { success: "Hari libur ditambahkan" }
}

export async function removeHoliday(id: string): Promise<State> {
  const ctx = await requireHr()
  if ("error" in ctx) return { error: ctx.error }

  await withTenantContext(ctx.tenantId, async (tx) => {
    // Hanya bisa hapus libur milik tenant (libur nasional tenant_id null tak terhapus)
    await tx
      .delete(holidays)
      .where(and(eq(holidays.id, id), eq(holidays.tenantId, ctx.tenantId)))
  })

  revalidatePath("/dashboard/leave/settings")
  return { success: "Hari libur dihapus" }
}
