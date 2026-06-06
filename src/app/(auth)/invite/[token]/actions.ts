"use server"
import { db } from "@/lib/db"
import { invitations, users, employees, userRoles } from "@/lib/db/schema"
import { eq, and, gt, isNull } from "drizzle-orm"
import { z } from "zod"
import bcryptjs from "bcryptjs"
import { signIn } from "@/lib/auth"
import { AuthError } from "next-auth"

const schema = z.object({
  token:           z.string().min(1),
  name:            z.string().min(2, "Nama minimal 2 karakter"),
  password:        z
    .string()
    .min(8, "Password minimal 8 karakter")
    .regex(/[A-Z]/, "Harus mengandung huruf kapital")
    .regex(/[0-9]/, "Harus mengandung angka"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Password tidak cocok",
  path: ["confirmPassword"],
})

export async function acceptInvitationAction(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const parsed = schema.safeParse({
    token:           formData.get("token"),
    name:            formData.get("name"),
    password:        formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  })

  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const invite = await db.query.invitations.findFirst({
    where: and(
      eq(invitations.token, parsed.data.token),
      gt(invitations.expiresAt, new Date()),
      isNull(invitations.acceptedAt),
    ),
  })

  if (!invite) return { error: "Undangan tidak valid atau sudah kedaluwarsa" }
  if (!invite.tenantId) return { error: "Undangan tidak memiliki tenant yang valid" }

  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, invite.email),
  })
  if (existingUser) return { error: "Email ini sudah terdaftar. Silakan login." }

  const hashedPassword = await bcryptjs.hash(parsed.data.password, 12)

  // Create user
  const [newUser] = await db.insert(users).values({
    email:    invite.email,
    name:     parsed.data.name,
    password: hashedPassword,
  }).returning()

  // Create employee record linked to tenant
  await db.insert(employees).values({
    userId:   newUser.id,
    tenantId: invite.tenantId,
  })

  // Assign role
  await db.insert(userRoles).values({
    userId:   newUser.id,
    roleId:   invite.roleId,
    tenantId: invite.tenantId,
  })

  // Mark invitation as accepted
  await db.update(invitations)
    .set({ acceptedAt: new Date() })
    .where(eq(invitations.id, invite.id))

  // Auto sign-in the new user
  try {
    await signIn("credentials", {
      email:      invite.email,
      password:   parsed.data.password,
      redirectTo: "/dashboard",
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Akun dibuat tapi login gagal. Silakan login manual." }
    }
    throw error
  }

  return {}
}
