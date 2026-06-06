"use server"
import { auth } from "@/lib/auth"
import { withTenantContext } from "@/lib/db"
import { notifications } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function markNotificationRead(id: string): Promise<void> {
  const session = await auth()
  if (!session?.user.tenantId) return
  const { tenantId, id: userId } = session.user

  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
  })
  revalidatePath("/dashboard/notifications")
}

export async function markAllNotificationsRead(): Promise<void> {
  const session = await auth()
  if (!session?.user.tenantId) return
  const { tenantId, id: userId } = session.user

  await withTenantContext(tenantId, async (tx) => {
    await tx
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.tenantId, tenantId),
          eq(notifications.userId, userId),
          eq(notifications.isRead, false),
        ),
      )
  })
  revalidatePath("/dashboard/notifications")
}
