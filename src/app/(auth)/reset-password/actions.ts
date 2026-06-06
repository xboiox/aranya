"use server"
import { db } from "@/lib/db"
import { users, passwordResets } from "@/lib/db/schema"
import { eq, and, gt, isNull } from "drizzle-orm"
import { z } from "zod"
import bcryptjs from "bcryptjs"
import { redirect } from "next/navigation"
import { logAudit } from "@/lib/audit"

const schema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .regex(/[A-Z]/, "Harus mengandung huruf kapital")
    .regex(/[0-9]/, "Harus mengandung angka"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Password tidak cocok",
  path: ["confirmPassword"],
})

export async function resetPasswordAction(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const parsed = schema.safeParse({
    token:           formData.get("token"),
    password:        formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  })

  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const resetRecord = await db.query.passwordResets.findFirst({
    where: and(
      eq(passwordResets.token, parsed.data.token),
      gt(passwordResets.expiresAt, new Date()),
      isNull(passwordResets.usedAt),
    ),
  })

  if (!resetRecord) return { error: "Link reset tidak valid atau sudah kedaluwarsa" }

  const hashedPassword = await bcryptjs.hash(parsed.data.password, 12)

  await db.update(users)
    .set({ password: hashedPassword, updatedAt: new Date() })
    .where(eq(users.id, resetRecord.userId))

  // Mark token as used
  await db.update(passwordResets)
    .set({ usedAt: new Date() })
    .where(eq(passwordResets.id, resetRecord.id))

  await logAudit({
    userId:     resetRecord.userId,
    action:     "auth.password_reset",
    entityType: "user",
    entityId:   resetRecord.userId,
  })

  redirect("/login?reset=success")
}
