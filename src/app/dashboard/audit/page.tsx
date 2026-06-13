import Link from "next/link"
import { redirect } from "next/navigation"
import { getLocale, getTranslations } from "next-intl/server"
import { auth, hasRole, hasAnyRole } from "@/lib/auth"
import { listTenantAuditLogs, listAllAuditLogs, type AuditRow } from "@/modules/audit/queries"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("colTime")}</TableHead>
            <TableHead>{t("colActor")}</TableHead>
            <TableHead>{t("colAction")}</TableHead>
            <TableHead>{t("colEntity")}</TableHead>
            {isSuper && <TableHead>{t("colTenant")}</TableHead>}
            <TableHead>{t("colIp")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableEmpty colSpan={isSuper ? 6 : 5}>{t("empty")}</TableEmpty>
          ) : (
            rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">{timeLabel(r.createdAt, locale)}</TableCell>
                <TableCell>{r.actorName ?? r.actorEmail ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{r.action}</TableCell>
                <TableCell className="text-muted-foreground">{r.entityType ?? "—"}</TableCell>
                {isSuper && <TableCell className="text-muted-foreground">{r.tenantName ?? "—"}</TableCell>}
                <TableCell className="text-muted-foreground">{r.ipAddress ?? "—"}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

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
