import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/auth"

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
      {/* TODO Fase 0: Super Admin sidebar */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
