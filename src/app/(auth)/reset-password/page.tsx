"use client"
import { useActionState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { Brand } from "@/components/layout/brand"
import { resetPasswordAction } from "./actions"

const inputClass =
  "mt-1.5 block w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""
  const [state, formAction, isPending] = useActionState(resetPasswordAction, {})
  const t = useTranslations("auth")

  if (!token) {
    return (
      <div className="text-center">
        <p className="text-sm text-destructive">{t("tokenMissing")}</p>
        <Link
          href="/forgot-password"
          className="mt-2 inline-block text-sm font-medium text-primary transition-colors hover:underline"
        >
          {t("requestNewLink")}
        </Link>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="token" value={token} />

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-foreground">
          {t("newPassword")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          className={inputClass}
        />
        <p className="mt-1.5 text-xs text-muted-foreground">{t("passwordHint")}</p>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
          {t("confirmPassword")}
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          className={inputClass}
        />
      </div>

      {state?.error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full cursor-pointer rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
      >
        {isPending ? t("saving") : t("saveNewPassword")}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  const t = useTranslations("auth")

  return (
    <div className="w-full rounded-2xl border border-border bg-card p-8 shadow-xl ring-1 ring-foreground/5">
      <div className="mb-8 flex flex-col items-center text-center">
        <Brand className="mb-4" />
        <h1 className="text-xl font-bold tracking-tight">{t("resetTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("resetSubtitle")}</p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">{t("loading")}</p>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
