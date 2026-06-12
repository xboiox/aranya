import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { auth } from "@/lib/auth"
import { Sidebar } from "@/components/layout/sidebar"
import { MobileNav } from "@/components/layout/mobile-nav"
import { countUnread } from "@/modules/notifications/queries"
import { getActiveModules } from "@/lib/modules"
import { db } from "@/lib/db"
import { tenants } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  // Blokir akses jika tenant dinonaktifkan (tenants tanpa RLS → query langsung)
  if (session.user.tenantId) {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, session.user.tenantId),
    })
    if (tenant && !tenant.isActive) {
      const t = await getTranslations("dashboard")
      return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
          <h1 className="text-xl font-semibold">{t("disabledTitle")}</h1>
          <p className="max-w-sm text-sm text-muted-foreground">{t("disabledBody")}</p>
        </main>
      )
    }
  }

  const [unreadCount, activeModules] = session.user.tenantId
    ? await Promise.all([
        countUnread(session.user.tenantId, session.user.id),
        getActiveModules(session.user.tenantId),
      ])
    : [0, [] as string[]]

  return (
    <div className="flex min-h-screen">
      <Sidebar
        name={session.user.name}
        email={session.user.email}
        roles={session.user.roles}
        activeModules={activeModules}
        unreadCount={unreadCount}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav
          name={session.user.name}
          email={session.user.email}
          roles={session.user.roles}
          activeModules={activeModules}
          unreadCount={unreadCount}
        />
        <main className="flex-1 overflow-x-hidden p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
