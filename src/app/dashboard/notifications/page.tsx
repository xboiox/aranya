import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { listNotifications } from "@/modules/notifications/queries"
import NotificationList from "./_list"

export default async function NotificationsPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (!session.user.tenantId) {
    return <p className="text-sm text-muted-foreground">Tidak ada notifikasi.</p>
  }

  const items = await listNotifications(session.user.tenantId, session.user.id)
  const hasUnread = items.some((i) => !i.isRead)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifikasi</h1>
      </div>
      <NotificationList
        items={items.map((i) => ({
          id: i.id,
          title: i.title,
          body: i.body,
          isRead: i.isRead,
          createdAt: new Date(i.createdAt).toLocaleString("id-ID", {
            timeZone: "Asia/Jakarta",
            dateStyle: "medium",
            timeStyle: "short",
          }),
        }))}
        hasUnread={hasUnread}
      />
    </div>
  )
}
