"use server"
import { auth, hasRole } from "@/lib/auth"
import { withTenantContext } from "@/lib/db"
import { assets, employees } from "@/lib/db/schema"
import { logAudit } from "@/lib/audit"
import { isModuleActive } from "@/lib/modules"
import { createAssetSchema } from "./schema"
import { eq, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"

type State = { error?: string; success?: string }

async function requireHrWithModule() {
  const session = await auth()
  if (!session) return { error: "Tidak terautentikasi" as const }
  const tenantId = session.user.tenantId
  if (!hasRole(session.user.roles, "hr_admin") || !tenantId) {
    return { error: "Hanya HR Admin yang dapat mengelola aset" as const }
  }
  if (!(await isModuleActive(tenantId, "MODULE_2"))) {
    return { error: "Modul HR Operations & Performance belum aktif" as const }
  }
  return { tenantId, userId: session.user.id }
}

export async function createAsset(_prev: State, formData: FormData): Promise<State> {
  const ctx = await requireHrWithModule()
  if ("error" in ctx) return { error: ctx.error }

  const parsed = createAssetSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    serialNumber: formData.get("serialNumber"),
    notes: formData.get("notes"),
  })
  if (!parsed.success) return { error: parsed.error.errors[0].message }
  const d = parsed.data

  await withTenantContext(ctx.tenantId, async (tx) => {
    await tx.insert(assets).values({
      tenantId: ctx.tenantId,
      name: d.name,
      category: d.category,
      serialNumber: d.serialNumber ?? null,
      notes: d.notes ?? null,
    })
  })

  await logAudit({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: "asset.create",
    entityType: "asset",
    newValues: { name: d.name, category: d.category },
  })

  revalidatePath("/dashboard/assets/manage")
  return { success: "Aset ditambahkan" }
}

// Pinjamkan ke karyawan, atau kembalikan (employeeId kosong)
export async function assignAsset(assetId: string, employeeId: string): Promise<State> {
  const ctx = await requireHrWithModule()
  if ("error" in ctx) return { error: ctx.error }

  const result = await withTenantContext(ctx.tenantId, async (tx) => {
    const asset = await tx.query.assets.findFirst({
      where: and(eq(assets.id, assetId), eq(assets.tenantId, ctx.tenantId)),
    })
    if (!asset) return { error: "Aset tidak ditemukan" as string }

    if (employeeId) {
      const emp = await tx.query.employees.findFirst({ where: eq(employees.id, employeeId) })
      if (!emp) return { error: "Karyawan tidak ditemukan" }
      await tx
        .update(assets)
        .set({ assignedToId: employeeId, assignedAt: new Date(), returnedAt: null })
        .where(eq(assets.id, assetId))
      return { action: "assign" }
    }

    await tx
      .update(assets)
      .set({ assignedToId: null, returnedAt: new Date() })
      .where(eq(assets.id, assetId))
    return { action: "return" }
  })

  if ("error" in result) return { error: result.error }

  await logAudit({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: result.action === "assign" ? "asset.assign" : "asset.return",
    entityType: "asset",
    entityId: assetId,
  })

  revalidatePath("/dashboard/assets/manage")
  return { success: result.action === "assign" ? "Aset dipinjamkan" : "Aset dikembalikan" }
}

export async function deleteAsset(id: string): Promise<State> {
  const ctx = await requireHrWithModule()
  if ("error" in ctx) return { error: ctx.error }

  await withTenantContext(ctx.tenantId, async (tx) => {
    await tx.delete(assets).where(and(eq(assets.id, id), eq(assets.tenantId, ctx.tenantId)))
  })

  await logAudit({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: "asset.delete",
    entityType: "asset",
    entityId: id,
  })

  revalidatePath("/dashboard/assets/manage")
  return { success: "Aset dihapus" }
}
