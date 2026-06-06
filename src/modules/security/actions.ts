"use server"
import { auth } from "@/lib/auth"
import { withSuperAdminContext } from "@/lib/db"
import { users, employees, userTwoFactor } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { logAudit } from "@/lib/audit"

type ResetState = { error?: string; success?: string }

// Reset (nonaktifkan) 2FA seorang user agar bisa enroll ulang.
// Otorisasi: Super Admin (semua tenant) atau HR Admin (hanya tenant-nya).
export async function resetUserTwoFactor(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const session = await auth()
  if (!session) return { error: "Tidak terautentikasi" }

  const roles = session.user.roles
  const isSuper = roles.includes("super_admin")
  const isHr = roles.includes("hr_admin")
  if (!isSuper && !isHr) return { error: "Tidak diizinkan" }

  const email = (formData.get("email") as string)?.trim().toLowerCase()
  if (!email) return { error: "Email wajib diisi" }

  const result = await withSuperAdminContext(async (tx) => {
    const user = await tx.query.users.findFirst({ where: eq(users.email, email) })
    if (!user) return { error: "User tidak ditemukan" as string }

    // HR Admin hanya boleh reset user di tenant-nya
    if (!isSuper) {
      const emp = await tx.query.employees.findFirst({
        where: eq(employees.userId, user.id),
      })
      if (!emp || emp.tenantId !== session.user.tenantId) {
        return { error: "User bukan bagian dari perusahaan Anda" }
      }
    }

    const deleted = await tx
      .delete(userTwoFactor)
      .where(eq(userTwoFactor.userId, user.id))
      .returning()
    if (deleted.length === 0) return { error: "User ini belum mengaktifkan 2FA" }

    return { userId: user.id, email }
  })

  if ("error" in result) return { error: result.error }

  await logAudit({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: "security.2fa_reset",
    entityType: "user",
    entityId: result.userId,
    newValues: { targetEmail: result.email },
  })

  return {
    success: `2FA untuk ${result.email} berhasil di-reset. User akan diminta enroll ulang saat login berikutnya.`,
  }
}
