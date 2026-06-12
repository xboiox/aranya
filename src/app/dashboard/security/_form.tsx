"use client"
import { useActionState } from "react"
import { useTranslations } from "next-intl"
import { resetUserTwoFactor } from "@/modules/security/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function ResetTwoFactorForm() {
  const [state, formAction, isPending] = useActionState(resetUserTwoFactor, {})
  const t = useTranslations("security")

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("cardTitle")}</CardTitle>
        <CardDescription>{t("cardDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("emailLabel")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder={t("emailPlaceholder")}
            />
          </div>

          {state.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}
          {state.success && (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              {state.success}
            </p>
          )}

          <Button type="submit" disabled={isPending} variant="destructive">
            {isPending ? t("processing") : t("resetButton")}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
