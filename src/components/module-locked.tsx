import { Lock } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { MODULE_LABELS } from "@/lib/modules"

export async function ModuleLocked({ moduleCode }: { moduleCode: string }) {
  const t = await getTranslations("moduleLocked")
  const moduleLabel = MODULE_LABELS[moduleCode] ?? moduleCode

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Lock className="size-6 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <p className="text-sm text-muted-foreground">
        {t.rich("body", {
          module: moduleLabel,
          imp: (chunks) => <strong>{chunks}</strong>,
        })}
      </p>
    </div>
  )
}
