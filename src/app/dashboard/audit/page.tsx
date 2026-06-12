import Link from "next/link"
import { redirect } from "next/navigation"
import { getLocale, getTranslations } from "next-intl/server"
import { auth, hasRole, hasAnyRole } from "@/lib/auth"
import { listTenantAuditLogs, listAllAuditLogs, type AuditRow } from "@/modules/audit/queries"
import { Button } from "@/components/ui/button"

function timeLabel(d: Date, locale: string): string {
  return new Date(d).toLocaleString(locale === "id" ? "id-ID" : "en-US", {
    timeZone: "Asia/Jakarta",
    dateStyle: "short",
    timeStyle: "short",
  })
}

interface Props {
  searchParams: Promise<{ page?: string }>
}

export default async function AuditPage({ searchParams }: Props) {
  const session = await auth()
  if (!session) redirect("/login")
  if (!hasAnyRole(session.user.roles, "hr_admin", "super_admin")) {
    redirect("/dashboard")
  }
  const t = await getTranslations("audit")
  const locale = await getLocale()

  const { page: pageParam } = await searchParams
  const page = Math.max(0, parseInt(pageParam ?? "0", 10) || 0)

  const isSuper = hasRole(session.user.roles, "super_admin")
  let rows: AuditRow[] = []
  let hasNext = false
  if (isSuper) {
    ;({ rows, hasNext } = await listAllAuditLogs(page))
  } else if (session.user.tenantId) {
    ;({ rows, hasNext } = await listTenantAuditLogs(session.user.tenantId, page))
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {isSuper ? t("subtitleAll") : t("subtitleTenant")}
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full divide-y text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">{t("colTime")}</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">{t("colActor")}</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">{t("colAction")}</th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">{t("colEntity")}</th>
              {isSuper && <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">{t("colTenant")}</th>}
              <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">{t("colIp")}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={isSuper ? 6 : 5} className="px-4 py-8 text-center text-muted-foreground">
                  {t("empty")}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">{timeLabel(r.createdAt, locale)}</td>
                  <td className="px-4 py-2">{r.actorName ?? r.actorEmail ?? "—"}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.action}</td>
                  <td className="px-4 py-2 text-muted-foreground">{r.entityType ?? "—"}</td>
                  {isSuper && <td className="px-4 py-2 text-muted-foreground">{r.tenantName ?? "—"}</td>}
                  <td className="px-4 py-2 text-muted-foreground">{r.ipAddress ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between">
        {page > 0 ? (
          <Button variant="outline" size="sm" render={<Link href={`/dashboard/audit?page=${page - 1}`} />}>
            {t("prev")}
          </Button>
        ) : <span />}
        {hasNext && (
          <Button variant="outline" size="sm" render={<Link href={`/dashboard/audit?page=${page + 1}`} />}>
            {t("next")}
          </Button>
        )}
      </div>
    </div>
  )
}
