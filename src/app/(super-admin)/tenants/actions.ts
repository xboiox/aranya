"use server"
import { withSuperAdminContext } from "@/lib/db"
import {
  tenants,
  tenantModules,
  invitations,
  roles,
  employees,
  users,
  auditLogs,
} from "@/lib/db/schema"
import { sendInvitationEmail } from "@/lib/email"
import { auth, hasRole } from "@/lib/auth"
import { logAudit } from "@/lib/audit"
import { eq, and, isNull, inArray } from "drizzle-orm"
import { z } from "zod"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import crypto from "crypto"

type ActionResult = { error?: string; success?: string }

async function requireSuperAdmin(): Promise<
  { error: string } | { userId: string; name: string }
> {
  const session = await auth()
  if (!session) return { error: "Tidak terautentikasi" }
  if (!hasRole(session.user.roles, "super_admin")) {
    return { error: "Hanya Super Admin yang diizinkan" }
  }
  return { userId: session.user.id, name: session.user.name ?? "Super Admin" }
}

const createTenantSchema = z.object({
  name:        z.string().min(2, "Nama perusahaan minimal 2 karakter"),
  slug:        z.string().min(2, "Slug minimal 2 karakter").regex(/^[a-z0-9-]+$/, "Slug hanya boleh huruf kecil, angka, dan tanda hubung"),
  hrAdminEmail: z.string().email("Email HR Admin tidak valid"),
  // checkbox: null bila tidak dicentang (tidak terkirim) → nullish menerima string|null|undefined
  module2:     z.string().nullish(),
  module3:     z.string().nullish(),
})

export async function createTenantAction(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const session = await auth()
  if (!session?.user.roles.includes("super_admin")) {
    return { error: "Tidak diizinkan" }
  }

  const parsed = createTenantSchema.safeParse({
    name:         formData.get("name"),
    slug:         formData.get("slug"),
    hrAdminEmail: formData.get("hrAdminEmail"),
    module2:      formData.get("module2"),
    module3:      formData.get("module3"),
  })

  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const token = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  // Semua tulisan ke tabel RLS (tenantModules, invitations) lewat bypass context.
  const result = await withSuperAdminContext(async (tx) => {
    const existing = await tx.query.tenants.findFirst({
      where: eq(tenants.slug, parsed.data.slug),
    })
    if (existing) return { error: "Slug sudah digunakan. Pilih yang lain." as string }

    const hrAdminRole = await tx.query.roles.findFirst({
      where: and(eq(roles.name, "hr_admin"), isNull(roles.tenantId)),
    })
    if (!hrAdminRole) {
      return { error: "Role hr_admin tidak ditemukan. Jalankan seed terlebih dahulu." }
    }

    const [tenant] = await tx.insert(tenants).values({
      name:               parsed.data.name,
      slug:               parsed.data.slug,
      isActive:           true,
      subscriptionStatus: "trial",
    }).returning()

    const modulesToActivate = ["MODULE_1"]
    if (parsed.data.module2 === "on") modulesToActivate.push("MODULE_2")
    if (parsed.data.module3 === "on" && parsed.data.module2 === "on") modulesToActivate.push("MODULE_3")

    await tx.insert(tenantModules).values(
      modulesToActivate.map((moduleCode) => ({
        tenantId:    tenant.id,
        moduleCode,
        isActive:    true,
        activatedAt: new Date(),
      })),
    )

    await tx.insert(invitations).values({
      tenantId:    tenant.id,
      email:       parsed.data.hrAdminEmail,
      roleId:      hrAdminRole.id,
      invitedById: session.user.id,
      token,
      expiresAt,
    })

    return { tenant, modules: modulesToActivate }
  })

  if ("error" in result) return { error: result.error }

  await logAudit({
    tenantId:   result.tenant.id,
    userId:     session.user.id,
    action:     "tenant.create",
    entityType: "tenant",
    entityId:   result.tenant.id,
    newValues:  { name: result.tenant.name, slug: result.tenant.slug, modules: result.modules },
  })

  const inviteUrl = `${process.env.AUTH_URL}/invite/${token}`
  await sendInvitationEmail(
    parsed.data.hrAdminEmail,
    inviteUrl,
    result.tenant.name,
    session.user.name ?? "Super Admin",
  )

  redirect("/tenants")
}

// ── Kirim ulang undangan HR Admin ────────────────────────────────────────────
export async function resendInvitation(tenantId: string): Promise<ActionResult> {
  const ctx = await requireSuperAdmin()
  if ("error" in ctx) return { error: ctx.error }

  const result = await withSuperAdminContext(async (tx) => {
    const tenant = await tx.query.tenants.findFirst({ where: eq(tenants.id, tenantId) })
    if (!tenant) return { error: "Tenant tidak ditemukan" as string }

    const invite = await tx.query.invitations.findFirst({
      where: and(eq(invitations.tenantId, tenantId), isNull(invitations.acceptedAt)),
      orderBy: (i, { desc }) => [desc(i.createdAt)],
    })
    if (!invite) return { error: "Tidak ada undangan pending (mungkin sudah diterima)" }

    // Perbarui token + expiry agar undangan segar
    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await tx
      .update(invitations)
      .set({ token, expiresAt })
      .where(eq(invitations.id, invite.id))

    return { email: invite.email, token, tenantName: tenant.name }
  })

  if ("error" in result) return { error: result.error }

  const inviteUrl = `${process.env.AUTH_URL}/invite/${result.token}`
  await sendInvitationEmail(result.email, inviteUrl, result.tenantName, ctx.name)

  await logAudit({
    tenantId,
    userId: ctx.userId,
    action: "tenant.resend_invitation",
    entityType: "tenant",
    entityId: tenantId,
  })

  revalidatePath(`/tenants/${tenantId}`)
  return { success: `Undangan dikirim ulang ke ${result.email}` }
}

// ── Aktif / nonaktifkan tenant (soft) ────────────────────────────────────────
export async function toggleTenantActive(tenantId: string): Promise<ActionResult> {
  const ctx = await requireSuperAdmin()
  if ("error" in ctx) return { error: ctx.error }

  const result = await withSuperAdminContext(async (tx) => {
    const tenant = await tx.query.tenants.findFirst({ where: eq(tenants.id, tenantId) })
    if (!tenant) return { error: "Tenant tidak ditemukan" as string }
    const next = !tenant.isActive
    await tx.update(tenants).set({ isActive: next, updatedAt: new Date() }).where(eq(tenants.id, tenantId))
    return { active: next }
  })

  if ("error" in result) return { error: result.error }

  await logAudit({
    tenantId,
    userId: ctx.userId,
    action: result.active ? "tenant.activate" : "tenant.deactivate",
    entityType: "tenant",
    entityId: tenantId,
  })

  revalidatePath(`/tenants/${tenantId}`)
  revalidatePath("/tenants")
  return { success: result.active ? "Tenant diaktifkan" : "Tenant dinonaktifkan" }
}

// ── Hapus tenant permanen (cascade) ──────────────────────────────────────────
export async function deleteTenant(
  tenantId: string,
  confirmName: string,
): Promise<ActionResult> {
  const ctx = await requireSuperAdmin()
  if ("error" in ctx) return { error: ctx.error }

  const result = await withSuperAdminContext(async (tx) => {
    const tenant = await tx.query.tenants.findFirst({ where: eq(tenants.id, tenantId) })
    if (!tenant) return { error: "Tenant tidak ditemukan" as string }
    if (confirmName.trim() !== tenant.name) {
      return { error: "Nama konfirmasi tidak cocok" }
    }

    // Kumpulkan user yang akan jadi yatim (karyawan tenant ini) sebelum cascade
    const emps = await tx
      .select({ userId: employees.userId })
      .from(employees)
      .where(eq(employees.tenantId, tenantId))
    const userIds = emps.map((e) => e.userId)

    // audit_logs.tenant_id tidak cascade → hapus dulu agar tidak memblokir
    await tx.delete(auditLogs).where(eq(auditLogs.tenantId, tenantId))

    // Hapus tenant → cascade ke employees, modules, invitations, attendance, leave, dll
    await tx.delete(tenants).where(eq(tenants.id, tenantId))

    // Bersihkan user yatim (akun auth tidak punya tenant_id, tidak ikut cascade)
    if (userIds.length > 0) {
      await tx.delete(users).where(inArray(users.id, userIds))
    }

    return { name: tenant.name }
  })

  if ("error" in result) return { error: result.error }

  // Audit dengan tenantId null (tenant sudah dihapus)
  await logAudit({
    tenantId: null,
    userId: ctx.userId,
    action: "tenant.delete",
    entityType: "tenant",
    entityId: tenantId,
    newValues: { name: result.name },
  })

  redirect("/tenants")
}
