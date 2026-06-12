import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { auth, hasRole, hasAnyRole } from "@/lib/auth"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Building2, Shield, Clock } from "lucide-react"

export default async function DashboardPage() {
  const session = await auth()
  const roles = session?.user.roles ?? []
  const isSuper = hasRole(roles, "super_admin")
  const isHrOrSuper = hasAnyRole(roles, "hr_admin", "super_admin")
  const t = await getTranslations("dashboard")
  const tCommon = await getTranslations("common")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {t("greeting", { name: session?.user?.name ?? tCommon("user") })}
        </h1>
        <p className="text-sm text-muted-foreground">{t("welcome")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isSuper && (
          <QuickCard
            href="/tenants"
            icon={<Building2 className="size-5" />}
            title={t("tenantsTitle")}
            desc={t("tenantsDesc")}
          />
        )}
        {isHrOrSuper && (
          <QuickCard
            href="/dashboard/security"
            icon={<Shield className="size-5" />}
            title={t("securityTitle")}
            desc={t("securityDesc")}
          />
        )}
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2.5 text-base">
              <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Clock className="size-5" />
              </span>
              {t("attendanceTitle")}
            </CardTitle>
            <CardDescription>{t("attendanceComingSoon")}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}

function QuickCard({
  href,
  icon,
  title,
  desc,
}: {
  href: string
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <Link href={href} className="group">
      <Card className="cursor-pointer transition-all hover:-translate-y-0.5 hover:ring-primary/40 hover:shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2.5 text-base">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              {icon}
            </span>
            {title}
          </CardTitle>
          <CardDescription>{desc}</CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </Link>
  )
}
