import { auth } from "@/lib/auth"

export default async function DashboardPage() {
  const session = await auth()
  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-gray-500">Welcome, {session?.user?.name}</p>
      {/* TODO Fase 0: Dashboard widgets */}
    </div>
  )
}
