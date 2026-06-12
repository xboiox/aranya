import { redirect } from "next/navigation"
import { getLocale, getTranslations } from "next-intl/server"
import { auth } from "@/lib/auth"
import { listNotifications } from "@/modules/notifications/queries"
import { notificationHref } from "@/modules/notifications/links"
import NotificationList from "./_list"

export default async function NotificationsPage() {
  const session = await auth()
  if (!session) redirect("/login")
  const t = await getTranslations("notifications")
  if (!session.user.tenantId) {
    return <p className="text-sm text-muted-foreground">{t("none")}</p>
  }

  const locale = await getLocale()
  const dateLocale = locale === "id" ? "id-ID" : "en-US"
  const items = await listNotifications(session.user.tenantId, session.user.id)
  const hasUnread = items.some((i) => !i.isRead)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </div>
      <NotificationList
        items={items.map((i) => ({
          id: i.id,
          title: i.title,
          body: i.body,
          isRead: i.isRead,
          href: notificationHref(i.type),
          createdAt: new Date(i.createdAt).toLocaleString(dateLocale, {
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
