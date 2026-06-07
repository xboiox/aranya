import { redirect } from "next/navigation"
import { auth, hasRole } from "@/lib/auth"
import { Sidebar } from "@/components/layout/sidebar"
import { MobileNav } from "@/components/layout/mobile-nav"

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session || !hasRole(session.user.roles, "super_admin")) {
    redirect("/login")
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        name={session.user.name}
        email={session.user.email}
        roles={session.user.roles}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav
          name={session.user.name}
          email={session.user.email}
          roles={session.user.roles}
        />
        <main className="flex-1 overflow-x-hidden p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
