"use client"
import { useActionState, useState } from "react"
import { useTranslations } from "next-intl"
import { verifyTwoFactor } from "../actions"

const inputBase =
  "mt-1.5 block w-full rounded-lg border border-input bg-background px-3 py-2 text-center font-mono tracking-widest transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
const primaryButton =
  "w-full cursor-pointer rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"

export default function TwoFactorVerify() {
  const [useBackup, setUseBackup] = useState(false)
  const [state, formAction, isPending] = useActionState(verifyTwoFactor, {})
  const t = useTranslations("twoFactor")

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold tracking-tight">{t("verifyTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {useBackup ? t("verifyBackupHint") : t("verifyAppHint")}
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        {useBackup ? (
          <div>
            <label htmlFor="backup_code" className="block text-sm font-medium text-foreground">
              {t("backupCode")}
            </label>
            <input
              id="backup_code"
              name="backup_code"
              type="text"
              required
              placeholder="XXXXXXXX"
              className={inputBase}
            />
          </div>
        ) : (
          <div>
            <label htmlFor="token" className="block text-sm font-medium text-foreground">
              {t("authCode")}
            </label>
            <input
              id="token"
              name="token"
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              placeholder="000000"
              className={`${inputBase} text-lg`}
            />
          </div>
        )}

        {state?.error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={isPending} className={primaryButton}>
          {isPending ? t("verifying") : t("verify")}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setUseBackup(!useBackup)}
        className="w-full cursor-pointer text-center text-sm font-medium text-primary transition-colors hover:underline"
      >
        {useBackup ? t("useApp") : t("useBackup")}
      </button>
    </div>
  )
}
