import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="flex min-h-screen">
      {/* TODO Fase 0: Sidebar component */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
