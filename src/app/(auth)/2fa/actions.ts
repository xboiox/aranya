"use server"
import { auth, unstable_update } from "@/lib/auth"
import { db } from "@/lib/db"
import { userTwoFactor } from "@/lib/db/schema"
import { generateTotpSecret, generateQrCodeDataUrl, verifyTotpToken, generateBackupCodes } from "@/lib/utils/totp"
import { eq } from "drizzle-orm"
import bcryptjs from "bcryptjs"
import { redirect } from "next/navigation"
import { z } from "zod"

// Initiate 2FA setup — generates secret and stores (not yet enabled)
export async function initTwoFactorSetup(): Promise<{
  qrCodeDataUrl: string
  secret: string
  error?: string
}> {
  const session = await auth()
  if (!session) return { qrCodeDataUrl: "", secret: "", error: "Tidak terautentikasi" }

  const secret = generateTotpSecret()
  const qrCodeDataUrl = await generateQrCodeDataUrl(session.user.email!, secret)

  // Upsert: save secret as disabled until verified
  await db
    .insert(userTwoFactor)
    .values({
      userId: session.user.id,
      totpSecret: secret, // TODO: encrypt at rest before production
      isEnabled: false,
      backupCodes: [],
    })
    .onConflictDoUpdate({
      target: userTwoFactor.userId,
      set: { totpSecret: secret, isEnabled: false, backupCodes: [] },
    })

  return { qrCodeDataUrl, secret }
}

const verifySchema = z.object({ token: z.string().length(6, "Kode harus 6 digit") })

// Complete 2FA setup — verify token and enable
export async function completeTwoFactorSetup(
  _prev: { error?: string; backupCodes?: string[] },
  formData: FormData,
): Promise<{ error?: string; backupCodes?: string[] }> {
  const session = await auth()
  if (!session) return { error: "Tidak terautentikasi" }

  const parsed = verifySchema.safeParse({ token: formData.get("token") })
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const record = await db.query.userTwoFactor.findFirst({
    where: eq(userTwoFactor.userId, session.user.id),
  })
  if (!record) return { error: "Setup belum dimulai. Muat ulang halaman." }

  const isValid = verifyTotpToken(parsed.data.token, record.totpSecret)
  if (!isValid) return { error: "Kode tidak valid. Pastikan waktu perangkat Anda benar." }

  const plainBackupCodes = generateBackupCodes(8)
  const hashedCodes = await Promise.all(plainBackupCodes.map((c) => bcryptjs.hash(c, 10)))

  await db
    .update(userTwoFactor)
    .set({ isEnabled: true, backupCodes: hashedCodes })
    .where(eq(userTwoFactor.userId, session.user.id))

  // Mark session as 2FA verified
  await unstable_update({ user: { isTwoFactorVerified: true } } as Parameters<typeof unstable_update>[0])

  return { backupCodes: plainBackupCodes }
}

// Verify 2FA — for users who already have 2FA enabled
export async function verifyTwoFactor(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const session = await auth()
  if (!session) return { error: "Tidak terautentikasi" }

  const token = (formData.get("token") as string)?.trim()
  const backupCode = (formData.get("backup_code") as string)?.trim()

  const record = await db.query.userTwoFactor.findFirst({
    where: eq(userTwoFactor.userId, session.user.id),
  })
  if (!record?.isEnabled) return { error: "2FA tidak aktif untuk akun ini" }

  let isValid = false

  if (token) {
    isValid = verifyTotpToken(token, record.totpSecret)
  } else if (backupCode) {
    // Check against hashed backup codes
    const storedCodes = record.backupCodes as string[]
    for (let i = 0; i < storedCodes.length; i++) {
      if (await bcryptjs.compare(backupCode.toUpperCase(), storedCodes[i])) {
        // Invalidate used backup code
        const remaining = storedCodes.filter((_, idx) => idx !== i)
        await db
          .update(userTwoFactor)
          .set({ backupCodes: remaining })
          .where(eq(userTwoFactor.userId, session.user.id))
        isValid = true
        break
      }
    }
  }

  if (!isValid) return { error: "Kode tidak valid" }

  await unstable_update({ user: { isTwoFactorVerified: true } } as Parameters<typeof unstable_update>[0])
  redirect("/dashboard")
}
