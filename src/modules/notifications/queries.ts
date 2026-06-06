import { withTenantContext } from "@/lib/db"
import { notifications } from "@/lib/db/schema"
import { eq, and, desc, count } from "drizzle-orm"

export type NotificationItem = typeof notifications.$inferSelect

export async function listNotifications(
  tenantId: string,
  userId: string,
  limit = 30,
): Promise<NotificationItem[]> {
  return withTenantContext(tenantId, async (tx) => {
    return tx
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.tenantId, tenantId),
          eq(notifications.userId, userId),
        ),
      )
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
  })
}

export async function countUnread(
  tenantId: string,
  userId: string,
): Promise<number> {
  return withTenantContext(tenantId, async (tx) => {
    const [row] = await tx
      .select({ n: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.tenantId, tenantId),
          eq(notifications.userId, userId),
          eq(notifications.isRead, false),
        ),
      )
    return row?.n ?? 0
  })
}
