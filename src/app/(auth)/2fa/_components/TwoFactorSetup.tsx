"use client"
import { useActionState, useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { initTwoFactorSetup, completeTwoFactorSetup } from "../actions"

const primaryButton =
  "w-full cursor-pointer rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"

export default function TwoFactorSetup() {
  const [qrCode, setQrCode] = useState<string>("")
  const [state, formAction, isPending] = useActionState(completeTwoFactorSetup, {})
  const t = useTranslations("twoFactor")

  useEffect(() => {
    initTwoFactorSetup().then((res) => {
      if (res.qrCodeDataUrl) setQrCode(res.qrCodeDataUrl)
    })
  }, [])

  if (state.backupCodes) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-emerald-50 p-4 dark:bg-emerald-500/10">
          <h3 className="font-semibold text-emerald-800 dark:text-emerald-300">
            {t("enabledTitle")}
          </h3>
          <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">{t("enabledBody")}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {state.backupCodes.map((code) => (
            <code
              key={code}
              className="rounded bg-muted px-3 py-1.5 text-center font-mono text-sm"
            >
              {code}
            </code>
          ))}
        </div>
        <a href="/dashboard" className={primaryButton}>
          {t("continueToDashboard")}
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold tracking-tight">{t("setupTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("setupHint")}</p>
      </div>

      {qrCode ? (
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCode} alt={t("qrAlt")} className="h-48 w-48 rounded-lg" />
        </div>
      ) : (
        <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-lg bg-muted">
          <span className="text-sm text-muted-foreground">{t("loadingQr")}</span>
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="token" className="block text-sm font-medium text-foreground">
            {t("enterCodeLabel")}
          </label>
          <input
            id="token"
            name="token"
            type="text"
            inputMode="numeric"
            maxLength={6}
            required
            placeholder="000000"
            className="mt-1.5 block w-full rounded-lg border border-input bg-background px-3 py-2 text-center font-mono text-lg tracking-widest transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
          />
        </div>

        {state?.error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={isPending || !qrCode} className={primaryButton}>
          {isPending ? t("verifying") : t("enable")}
        </button>
      </form>
    </div>
  )
}
