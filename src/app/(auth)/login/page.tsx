"use client"
import { useActionState } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { Brand } from "@/components/layout/brand"
import { loginAction } from "./actions"

const inputClass =
  "mt-1.5 block w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, {})
  const t = useTranslations("auth")

  return (
    <div className="w-full rounded-2xl border border-border bg-card p-8 shadow-xl ring-1 ring-foreground/5">
      <div className="mb-8 flex flex-col items-center text-center">
        <Brand className="mb-4" />
        <h1 className="text-xl font-bold tracking-tight">{t("welcomeBack")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
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

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-foreground">
            {t("password")}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
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
          {isPending ? t("signingIn") : t("signIn")}
        </button>

        <p className="text-center text-sm text-muted-foreground">
          <Link
            href="/forgot-password"
            className="font-medium text-primary transition-colors hover:underline"
          >
            {t("forgotPassword")}
          </Link>
        </p>
      </form>
    </div>
  )
}
