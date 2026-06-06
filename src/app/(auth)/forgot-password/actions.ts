"use server"
import { db } from "@/lib/db"
import { users, passwordResets } from "@/lib/db/schema"
import { sendPasswordResetEmail } from "@/lib/email"
import { eq } from "drizzle-orm"
import { z } from "zod"
import crypto from "crypto"

const schema = z.object({
  email: z.string().email("Email tidak valid"),
})

export async function forgotPasswordAction(
  _prev: { error?: string; success?: boolean },
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const parsed = schema.safeParse({ email: formData.get("email") })
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const user = await db.query.users.findFirst({
    where: eq(users.email, parsed.data.email),
  })

  // Always return success to prevent email enumeration
  if (!user) return { success: true }

  const token = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  await db.insert(passwordResets).values({
    userId: user.id,
    token,
    expiresAt,
  })

  const resetUrl = `${process.env.AUTH_URL}/reset-password?token=${token}`
  await sendPasswordResetEmail(parsed.data.email, resetUrl)

  return { success: true }
}
