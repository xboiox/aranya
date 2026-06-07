import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { Sidebar } from "@/components/layout/sidebar"
import { countUnread } from "@/modules/notifications/queries"
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
      return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
          <h1 className="text-xl font-semibold">Akses Dinonaktifkan</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Perusahaan Anda saat ini dinonaktifkan. Hubungi administrator Aranya untuk
            informasi lebih lanjut.
          </p>
        </main>
      )
    }
  }

  const unreadCount = session.user.tenantId
    ? await countUnread(session.user.tenantId, session.user.id)
    : 0

  return (
    <div className="flex min-h-screen">
      <Sidebar
        name={session.user.name}
        email={session.user.email}
        roles={session.user.roles}
        unreadCount={unreadCount}
      />
      <main className="flex-1 overflow-x-hidden p-6">{children}</main>
    </div>
  )
}
