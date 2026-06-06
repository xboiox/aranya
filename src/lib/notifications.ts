import { withSuperAdminContext } from "@/lib/db"
import { notifications } from "@/lib/db/schema"
import { sendNotificationEmail } from "@/lib/email"

interface NotifyInput {
  tenantId: string
  userId: string
  type: string
  title: string
  body: string
  data?: unknown
  /** Jika diisi, kirim juga email ke alamat ini */
  email?: string
}

/**
 * Buat notifikasi in-app (dan opsional email). Insert lewat bypass context
 * karena notify menargetkan recipient tertentu (operasi sistem).
 * Fail-safe: kegagalan notifikasi tidak menggagalkan operasi utama.
 */
export async function notify(input: NotifyInput): Promise<void> {
  try {
    await withSuperAdminContext(async (tx) => {
      await tx.insert(notifications).values({
        tenantId: input.tenantId,
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data != null ? JSON.stringify(input.data) : null,
      })
    })

    if (input.email) {
      await sendNotificationEmail(input.email, input.title, input.body)
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[notify] gagal membuat notifikasi:", err)
  }
}
