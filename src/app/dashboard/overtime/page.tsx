import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { auth } from "@/lib/auth"
import { getEmployeeIdByUser } from "@/modules/attendance/queries"
import { listMyOvertime } from "@/modules/overtime/queries"
import { formatMinutes } from "@/lib/time"
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
import OvertimeRequestForm from "./_form"
import CancelOvertimeButton from "./_cancel"

function dateLabel(d: Date): string {
  return new Date(d).toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export default async function OvertimePage() {
  const session = await auth()
  if (!session) redirect("/login")
  const t = await getTranslations()
  const tenantId = session.user.tenantId
  if (!tenantId) {
    return <p className="text-sm text-muted-foreground">{t("common.noCompany")}</p>
  }

  const employeeId = await getEmployeeIdByUser(tenantId, session.user.id)
  if (!employeeId) {
    return <p className="text-sm text-muted-foreground">{t("overtime.employeeOnly")}</p>
  }

  const requests = await listMyOvertime(tenantId, employeeId)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">{t("overtime.title")}</h1>

      <OvertimeRequestForm />

      <div>
        <h2 className="mb-2 text-sm font-semibold">{t("overtime.history")}</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("overtime.colDate")}</TableHead>
              <TableHead>{t("overtime.colTime")}</TableHead>
              <TableHead>{t("overtime.colDuration")}</TableHead>
              <TableHead>{t("overtime.colStatus")}</TableHead>
              <TableHead className="text-right">{t("overtime.colAction")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableEmpty colSpan={5}>{t("overtime.empty")}</TableEmpty>
            ) : (
              requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{dateLabel(r.date)}</TableCell>
                  <TableCell>{r.startTime}–{r.endTime}</TableCell>
                  <TableCell>{formatMinutes(r.durationMinutes)}</TableCell>
                  <TableCell>
                    <Badge variant={requestStatusVariant(r.status)}>
                      {t(`requestStatus.${r.status}`)}
                    </Badge>
                    {r.status === "rejected" && r.rejectionReason && (
                      <p className="mt-1 text-xs text-muted-foreground">{r.rejectionReason}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === "pending" && <CancelOvertimeButton id={r.id} />}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
