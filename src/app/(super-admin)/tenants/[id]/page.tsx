import Link from "next/link"
import { redirect, notFound } from "next/navigation"
import { auth, hasRole } from "@/lib/auth"
import { getTenantDetail } from "../queries"
import TenantActionsPanel from "./_actions-panel"

const MODULE_LABEL: Record<string, string> = {
  MODULE_1: "Core HR",
  MODULE_2: "Payroll & Performance",
  MODULE_3: "HR Operations",
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function TenantDetailPage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  if (!session) redirect("/login")
  if (!hasRole(session.user.roles, "super_admin")) redirect("/dashboard")

  const detail = await getTenantDetail(id)
  if (!detail) notFound()

  const { tenant, modules, pendingInvite, employeeCount } = detail

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/tenants" className="text-sm text-primary hover:underline">
          ← Kembali ke daftar
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold">{tenant.name}</h1>
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
              tenant.isActive ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
            }`}
          >
            {tenant.isActive ? "Aktif" : "Nonaktif"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {tenant.slug} · {tenant.subscriptionStatus} · {employeeCount} karyawan
        </p>
      </div>

      <div className="rounded-xl border p-4">
        <p className="mb-2 text-sm font-medium">Modul Aktif</p>
        <div className="flex flex-wrap gap-2">
          {modules
            .filter((m) => m.isActive)
            .map((m) => (
              <span key={m.moduleCode} className="rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">
                {MODULE_LABEL[m.moduleCode] ?? m.moduleCode}
              </span>
            ))}
        </div>
      </div>

      <div className="rounded-xl border p-4">
        <p className="mb-1 text-sm font-medium">Undangan HR Admin</p>
        {pendingInvite ? (
          <p className="text-sm text-muted-foreground">
            {pendingInvite.email} —{" "}
            {pendingInvite.isExpired ? (
              <span className="text-amber-600">kedaluwarsa</span>
            ) : (
              "menunggu aktivasi"
            )}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Tidak ada undangan pending (sudah diterima).</p>
        )}
      </div>

      <TenantActionsPanel
        tenantId={tenant.id}
        tenantName={tenant.name}
        isActive={tenant.isActive}
        hasPendingInvite={Boolean(pendingInvite)}
      />
    </div>
  )
}
