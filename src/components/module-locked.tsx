import { Lock } from "lucide-react"
import { MODULE_LABELS } from "@/lib/modules"

export function ModuleLocked({ moduleCode }: { moduleCode: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Lock className="size-6 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-semibold">Modul belum aktif</h1>
      <p className="text-sm text-muted-foreground">
        Fitur ini bagian dari <strong>{MODULE_LABELS[moduleCode] ?? moduleCode}</strong> yang
        belum diaktifkan untuk perusahaan Anda. Hubungi administrator Aranya untuk mengaktifkan.
      </p>
    </div>
  )
}
