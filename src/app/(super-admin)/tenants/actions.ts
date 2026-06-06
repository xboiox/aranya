"use server"
import { withSuperAdminContext } from "@/lib/db"
import { tenants, tenantModules, invitations, roles } from "@/lib/db/schema"
import { sendInvitationEmail } from "@/lib/email"
import { auth } from "@/lib/auth"
import { logAudit } from "@/lib/audit"
import { eq, and, isNull } from "drizzle-orm"
import { z } from "zod"
import { redirect } from "next/navigation"
import crypto from "crypto"

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
