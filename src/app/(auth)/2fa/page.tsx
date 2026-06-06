import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { userTwoFactor } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import TwoFactorSetup from "./_components/TwoFactorSetup"
import TwoFactorVerify from "./_components/TwoFactorVerify"

export default async function TwoFactorPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const record = await db.query.userTwoFactor.findFirst({
    where: eq(userTwoFactor.userId, session.user.id),
  })

  const isSetupComplete = record?.isEnabled === true

  return (
    <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
      {isSetupComplete ? <TwoFactorVerify /> : <TwoFactorSetup />}
    </div>
  )
}
