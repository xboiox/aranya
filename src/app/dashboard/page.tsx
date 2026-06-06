import Link from "next/link"
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Halo, {session?.user?.name ?? "Pengguna"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Selamat datang di Aranya HRIS.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isSuper && (
          <QuickCard
            href="/tenants"
            icon={<Building2 className="size-5" />}
            title="Kelola Tenant"
            desc="Buat & kelola perusahaan, kirim undangan HR Admin."
          />
        )}
        {isHrOrSuper && (
          <QuickCard
            href="/dashboard/security"
            icon={<Shield className="size-5" />}
            title="Keamanan"
            desc="Reset 2FA karyawan yang kehilangan akses."
          />
        )}
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="size-5" /> Absensi
            </CardTitle>
            <CardDescription>Segera hadir di Modul 1.</CardDescription>
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
    <Link href={href}>
      <Card className="transition-colors hover:border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {icon} {title}
          </CardTitle>
          <CardDescription>{desc}</CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </Link>
  )
}
