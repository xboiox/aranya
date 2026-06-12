"use client"
import { useActionState } from "react"
import { useTranslations } from "next-intl"
import { acceptInvitationAction } from "./actions"

interface Props {
  token: string
  email: string
}

const inputClass =
  "mt-1.5 block w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"

export default function InviteForm({ token, email: _email }: Props) {
  const [state, formAction, isPending] = useActionState(acceptInvitationAction, {})
  const t = useTranslations("invite")
  const tAuth = useTranslations("auth")

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="token" value={token} />

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-foreground">
          {t("fullName")}
        </label>
        <input id="name" name="name" type="text" required autoComplete="name" className={inputClass} />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-foreground">
          {tAuth("password")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          className={inputClass}
        />
        <p className="mt-1.5 text-xs text-muted-foreground">{tAuth("passwordHint")}</p>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
          {tAuth("confirmPassword")}
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
        {isPending ? t("creating") : t("createAccount")}
      </button>
    </form>
  )
}
