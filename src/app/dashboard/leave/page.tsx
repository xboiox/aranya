import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { auth } from "@/lib/auth"
import { getEmployeeIdByUser } from "@/modules/attendance/queries"
import { listMyLeaveRequests, getLeaveBalance } from "@/modules/leave/queries"
import { todayJakarta } from "@/lib/date"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { requestStatusVariant } from "@/lib/status"
import LeaveRequestForm from "./_form"
import CancelLeaveButton from "./_cancel"

function dateLabel(d: Date): string {
  return new Date(d).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export default async function LeavePage() {
  const session = await auth()
  if (!session) redirect("/login")
  const t = await getTranslations()
  const tenantId = session.user.tenantId
  if (!tenantId) {
    return <p className="text-sm text-muted-foreground">{t("common.noCompany")}</p>
  }

  const employeeId = await getEmployeeIdByUser(tenantId, session.user.id)
  if (!employeeId) {
    return <p className="text-sm text-muted-foreground">{t("leave.employeeOnly")}</p>
  }

  const [requests, balance] = await Promise.all([
    listMyLeaveRequests(tenantId, employeeId),
    getLeaveBalance(tenantId, employeeId),
  ])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">{t("leave.title")}</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t("leave.quotaAnnual")}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{t("leave.days", { count: balance.quota })}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t("leave.used")}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{t("leave.days", { count: balance.used })}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t("leave.remaining")}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-primary">{t("leave.days", { count: balance.remaining })}</CardContent>
        </Card>
      </div>

      <LeaveRequestForm />

      <div>
        <h2 className="mb-2 text-sm font-semibold">{t("leave.history")}</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("leave.colType")}</TableHead>
              <TableHead>{t("leave.colDate")}</TableHead>
              <TableHead>{t("leave.colDays")}</TableHead>
              <TableHead>{t("leave.colStatus")}</TableHead>
              <TableHead className="text-right">{t("leave.colAction")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableEmpty colSpan={5}>{t("leave.empty")}</TableEmpty>
            ) : (
              requests.map((r) => {
                const cancellable =
                  r.status === "pending" ||
                  (r.status === "approved" && new Date(r.startDate) > todayJakarta())
                return (
                  <TableRow key={r.id}>
                    <TableCell>{t(`leave.types.${r.type}`)}</TableCell>
                    <TableCell>
                      {dateLabel(r.startDate)} – {dateLabel(r.endDate)}
                    </TableCell>
                    <TableCell>{r.totalDays}</TableCell>
                    <TableCell>
                      <Badge variant={requestStatusVariant(r.status)}>
                        {t(`requestStatus.${r.status}`)}
                      </Badge>
                      {r.status === "rejected" && r.rejectionReason && (
                        <p className="mt-1 text-xs text-muted-foreground">{r.rejectionReason}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {cancellable && <CancelLeaveButton id={r.id} />}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
