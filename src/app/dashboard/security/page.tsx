import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { auth, hasAnyRole } from "@/lib/auth"
import ResetTwoFactorForm from "./_form"

export default async function SecurityPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (!hasAnyRole(session.user.roles, "super_admin", "hr_admin")) {
    redirect("/dashboard")
  }
  const t = await getTranslations("security")

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <ResetTwoFactorForm />
    </div>
  )
}
