"use server"
import { db } from "@/lib/db"
import { tenants, tenantModules, invitations, roles } from "@/lib/db/schema"
import { sendInvitationEmail } from "@/lib/email"
import { auth } from "@/lib/auth"
import { eq, isNull } from "drizzle-orm"
import { z } from "zod"
import { redirect } from "next/navigation"
import crypto from "crypto"

const createTenantSchema = z.object({
  name:        z.string().min(2, "Nama perusahaan minimal 2 karakter"),
  slug:        z.string().min(2, "Slug minimal 2 karakter").regex(/^[a-z0-9-]+$/, "Slug hanya boleh huruf kecil, angka, dan tanda hubung"),
  hrAdminEmail: z.string().email("Email HR Admin tidak valid"),
  module2:     z.string().optional(),
  module3:     z.string().optional(),
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

  // Check slug uniqueness
  const existing = await db.query.tenants.findFirst({
    where: eq(tenants.slug, parsed.data.slug),
  })
  if (existing) return { error: "Slug sudah digunakan. Pilih yang lain." }

  // Create tenant
  const [tenant] = await db.insert(tenants).values({
    name:   parsed.data.name,
    slug:   parsed.data.slug,
    isActive:           true,
    subscriptionStatus: "trial",
  }).returning()

  // Activate modules
  const modulesToActivate = ["MODULE_1"]
  if (parsed.data.module2 === "on") modulesToActivate.push("MODULE_2")
  if (parsed.data.module3 === "on" && parsed.data.module2 === "on") modulesToActivate.push("MODULE_3")

  await db.insert(tenantModules).values(
    modulesToActivate.map((moduleCode) => ({
      tenantId:    tenant.id,
      moduleCode,
      isActive:    true,
      activatedAt: new Date(),
    })),
  )

  // Find HR Admin role (system role, tenantId = null)
  const hrAdminRole = await db.query.roles.findFirst({
    where: (r, { and, eq }) => and(eq(r.name, "hr_admin"), isNull(r.tenantId)),
  })
  if (!hrAdminRole) return { error: "Role hr_admin tidak ditemukan. Jalankan seed terlebih dahulu." }

  // Create invitation
  const token = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  await db.insert(invitations).values({
    tenantId:    tenant.id,
    email:       parsed.data.hrAdminEmail,
    roleId:      hrAdminRole.id,
    invitedById: session.user.id,
    token,
    expiresAt,
  })

  const inviteUrl = `${process.env.AUTH_URL}/invite/${token}`
  await sendInvitationEmail(
    parsed.data.hrAdminEmail,
    inviteUrl,
    tenant.name,
    session.user.name ?? "Super Admin",
  )

  redirect("/tenants")
}
