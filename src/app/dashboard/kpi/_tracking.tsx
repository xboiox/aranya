"use client"
import { useActionState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { addProgress } from "@/modules/kpi/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface ProgressItem {
  id: string
  percent: number
  note: string | null
  evidenceName: string | null
  hasEvidence: boolean
  date: string
}

export interface FeedbackItem {
  id: string
  fromName: string | null
  message: string
  date: string
}

interface Props {
  kpiId: string
  latestPercent: number
  progress: ProgressItem[]
  feedback: FeedbackItem[]
}

export default function KpiTracking({ kpiId, latestPercent, progress, feedback }: Props) {
  const [state, formAction, isPending] = useActionState(addProgress, {})
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (state.success) {
      toast.success(state.success)
      formRef.current?.reset()
      router.refresh()
    }
  }, [state.success, router])

  return (
    <div className="mt-3 space-y-3 border-t pt-3">
      <div>
        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
          <span>Progres</span>
          <span>{latestPercent}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${latestPercent}%` }} />
        </div>
      </div>

      {feedback.length > 0 && (
        <div className="space-y-1">
          {feedback.map((f) => (
            <p key={f.id} className="rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-900">
              <span className="font-medium">{f.fromName ?? "Atasan"}:</span> {f.message}
              <span className="ml-1 text-blue-500">· {f.date}</span>
            </p>
          ))}
        </div>
      )}

      <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="kpiId" value={kpiId} />
        <div>
          <label htmlFor={`pct-${kpiId}`} className="text-xs text-muted-foreground">Progres (%)</label>
          <Input id={`pct-${kpiId}`} name="percent" type="number" min={0} max={100} defaultValue={latestPercent} className="w-24" required />
        </div>
        <Input name="note" placeholder="Catatan (opsional)" className="min-w-40 flex-1" />
        <input
          type="file"
          name="evidence"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          className="text-xs file:mr-2 file:rounded file:border file:border-input file:bg-background file:px-2 file:py-1 file:text-xs"
        />
        <Button size="sm" type="submit" disabled={isPending}>
          {isPending ? "Menyimpan…" : "Update"}
        </Button>
      </form>
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}

      {progress.length > 0 && (
        <ul className="space-y-1 text-xs text-muted-foreground">
          {progress.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">{p.percent}%</span>
              <span>· {p.date}</span>
              {p.note && <span>· {p.note}</span>}
              {p.hasEvidence && (
                <a href={`/api/kpi/evidence/${p.id}`} className="text-primary hover:underline">
                  📎 {p.evidenceName ?? "bukti"}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
