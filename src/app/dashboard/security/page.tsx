import { redirect } from "next/navigation"
import { auth, hasAnyRole } from "@/lib/auth"
import ResetTwoFactorForm from "./_form"

export default async function SecurityPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (!hasAnyRole(session.user.roles, "super_admin", "hr_admin")) {
    redirect("/dashboard")
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Keamanan</h1>
        <p className="text-sm text-muted-foreground">
          Reset 2FA karyawan yang kehilangan akses ke aplikasi authenticator.
        </p>
      </div>
      <ResetTwoFactorForm />
    </div>
  )
}
