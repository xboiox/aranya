"use client"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { Languages } from "lucide-react"
import { cn } from "@/lib/utils"
import { locales } from "@/i18n/routing"
import { setLocale } from "@/i18n/actions"

/**
 * Segmented control EN/ID. Menyimpan preferensi (cookie + DB) lalu refresh
 * agar seluruh teks ter-render ulang dalam bahasa baru.
 */
export function LocaleToggle() {
  const current = useLocale()
  const t = useTranslations("language")
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function change(next: (typeof locales)[number]) {
    if (next === current || isPending) return
    startTransition(async () => {
      await setLocale(next)
      router.refresh()
    })
  }

  return (
    <div className="px-2 py-1.5">
      <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Languages className="size-3.5" />
        {t("label")}
      </div>
      <div className="flex gap-1 rounded-md bg-muted p-0.5">
        {locales.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => change(l)}
            disabled={isPending}
            aria-pressed={current === l}
            className={cn(
              "flex-1 cursor-pointer rounded px-2 py-1 text-xs font-medium transition-colors disabled:opacity-60",
              current === l
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t(l)}
          </button>
        ))}
      </div>
    </div>
  )
}
