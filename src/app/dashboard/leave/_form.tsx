"use client"
import { useActionState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { requestLeave } from "@/modules/leave/actions"
import { LEAVE_TYPES } from "@/modules/leave/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function LeaveRequestForm() {
  const [state, formAction, isPending] = useActionState(requestLeave, {})
  const router = useRouter()
  const t = useTranslations("leave")

  useEffect(() => {
    if (state.success) {
      toast.success(state.success)
      router.refresh()
    }
  }, [state.success, router])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("formTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">{t("fieldType")}</Label>
              <Select id="type" name="type" className="w-full" defaultValue="annual">
                {LEAVE_TYPES.map((lt) => (
                  <option key={lt.value} value={lt.value}>
                    {t(`types.${lt.value}`)}
                  </option>
                ))}
              </Select>
            </div>
            <div />
            <div className="space-y-2">
              <Label htmlFor="startDate">{t("fieldStart")}</Label>
              <Input id="startDate" name="startDate" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">{t("fieldEnd")}</Label>
              <Input id="endDate" name="endDate" type="date" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">{t("fieldReason")}</Label>
            <Input id="reason" name="reason" />
          </div>

          {state.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}

          <Button type="submit" disabled={isPending}>
            {isPending ? t("submitting") : t("submit")}
          </Button>
          <p className="text-xs text-muted-foreground">{t("daysHint")}</p>
        </form>
      </CardContent>
    </Card>
  )
}
