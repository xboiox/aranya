"use client"
import { useActionState } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { Brand } from "@/components/layout/brand"
import { forgotPasswordAction } from "./actions"

const cardClass =
  "w-full rounded-2xl border border-border bg-card p-8 shadow-xl ring-1 ring-foreground/5"
const inputClass =
  "mt-1.5 block w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(forgotPasswordAction, {})
  const t = useTranslations("auth")

  if (state.success) {
    return (
      <div className={`${cardClass} text-center`}>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
          <svg className="h-6 w-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold">{t("emailSentTitle")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("emailSentBody")}</p>
        <Link
          href="/login"
          className="mt-4 inline-block text-sm font-medium text-primary transition-colors hover:underline"
        >
          {t("backToLogin")}
        </Link>
      </div>
    )
  }

  return (
    <div className={cardClass}>
      <div className="mb-8 flex flex-col items-center text-center">
        <Brand className="mb-4" />
        <h1 className="text-xl font-bold tracking-tight">{t("forgotTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("forgotSubtitle")}</p>
      </div>

      <form action={formAction} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground">
            {t("email")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder={t("emailPlaceholder")}
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
          {isPending ? t("sending") : t("sendResetLink")}
        </button>

        <p className="text-center text-sm">
          <Link
            href="/login"
            className="font-medium text-primary transition-colors hover:underline"
          >
            {t("backToLogin")}
          </Link>
        </p>
      </form>
    </div>
  )
}
