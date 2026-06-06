import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { Sidebar } from "@/components/layout/sidebar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="flex min-h-screen">
      <Sidebar
        name={session.user.name}
        email={session.user.email}
        roles={session.user.roles}
      />
      <main className="flex-1 overflow-x-hidden p-6">{children}</main>
    </div>
  )
}
