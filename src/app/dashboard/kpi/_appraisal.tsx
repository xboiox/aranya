"use client"
import { useActionState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { setSelfScore } from "@/modules/kpi/actions"
import { SCORE_LABEL } from "@/modules/kpi/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Props {
  kpiId: string
  currentSelfScore: number | null
  currentSelfNote: string | null
}

const selectClass = "rounded-md border border-input bg-background px-3 py-2 text-sm"

export default function KpiAppraisal({ kpiId, currentSelfScore, currentSelfNote }: Props) {
  const [state, formAction, isPending] = useActionState(setSelfScore, {})
  const router = useRouter()

  useEffect(() => {
    if (state.success) {
      toast.success(state.success)
      router.refresh()
    }
  }, [state.success, router])

  return (
    <form action={formAction} className="mt-3 space-y-2 border-t pt-3">
      <input type="hidden" name="kpiId" value={kpiId} />
      <p className="text-xs font-medium text-muted-foreground">Penilaian diri (self-assessment)</p>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor={`self-${kpiId}`} className="text-xs text-muted-foreground">Skor (1–5)</label>
          <select id={`self-${kpiId}`} name="selfScore" defaultValue={currentSelfScore ?? ""} className={`mt-1 block ${selectClass}`} required>
            <option value="" disabled>Pilih</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n} — {SCORE_LABEL[n]}</option>
            ))}
          </select>
        </div>
        <Input name="selfNote" defaultValue={currentSelfNote ?? ""} placeholder="Kendala / catatan (opsional)" className="min-w-48 flex-1" />
        <Button size="sm" type="submit" disabled={isPending}>
          {isPending ? "Menyimpan…" : currentSelfScore ? "Perbarui" : "Simpan"}
        </Button>
      </div>
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
    </form>
  )
}
