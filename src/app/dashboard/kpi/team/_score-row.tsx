"use client"
import { useActionState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { setManagerScore, calibrateFinalScore } from "@/modules/kpi/actions"
import { SCORE_LABEL } from "@/modules/kpi/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Props {
  id: string
  title: string
  weight: number
  selfScore: number | null
  selfNote: string | null
  managerScore: number | null
  managerNote: string | null
  finalScore: number | null
  mode: "appraisal" | "locked"
  canCalibrate: boolean
}

const selectClass = "rounded-md border border-input bg-background px-3 py-2 text-sm"

function ScoreSelect({ name, defaultValue }: { name: string; defaultValue: number | null }) {
  return (
    <select name={name} defaultValue={defaultValue ?? ""} className={selectClass} required>
      <option value="" disabled>Skor</option>
      {[1, 2, 3, 4, 5].map((n) => (
        <option key={n} value={n}>{n} — {SCORE_LABEL[n]}</option>
      ))}
    </select>
  )
}

export default function KpiScoreRow(props: Props) {
  const { id, title, weight, selfScore, selfNote, managerScore, managerNote, finalScore, mode, canCalibrate } = props
  const action = mode === "locked" ? calibrateFinalScore : setManagerScore
  const [state, formAction, isPending] = useActionState(action, {})
  const router = useRouter()

  useEffect(() => {
    if (state.success) {
      toast.success(state.success)
      router.refresh()
    }
  }, [state.success, router])

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">Bobot {weight}%</p>
        </div>
        {finalScore != null && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
            Final: {finalScore}
          </span>
        )}
      </div>

      <div className="mt-1 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span>Nilai diri: {selfScore ?? "—"}</span>
        <span>Nilai manajer: {managerScore ?? "—"}</span>
      </div>
      {selfNote && <p className="mt-1 text-xs text-muted-foreground">Kendala karyawan: {selfNote}</p>}
      {managerNote && <p className="text-xs text-muted-foreground">Catatan manajer: {managerNote}</p>}

      {mode === "appraisal" && (
        <form action={formAction} className="mt-2 flex flex-wrap items-center gap-2">
          <input type="hidden" name="kpiId" value={id} />
          <ScoreSelect name="managerScore" defaultValue={managerScore} />
          <Input name="managerNote" defaultValue={managerNote ?? ""} placeholder="Catatan (opsional)" className="min-w-40 flex-1" />
          <Button size="sm" type="submit" disabled={isPending}>
            {isPending ? "Menyimpan…" : managerScore ? "Perbarui nilai" : "Nilai"}
          </Button>
          {state.error && <p className="w-full text-xs text-destructive">{state.error}</p>}
        </form>
      )}

      {mode === "locked" && canCalibrate && (
        <form action={formAction} className="mt-2 flex flex-wrap items-center gap-2">
          <input type="hidden" name="kpiId" value={id} />
          <span className="text-xs text-muted-foreground">Kalibrasi skor akhir:</span>
          <ScoreSelect name="finalScore" defaultValue={finalScore} />
          <Button size="sm" variant="outline" type="submit" disabled={isPending}>
            {isPending ? "Menyimpan…" : "Simpan"}
          </Button>
          {state.error && <p className="w-full text-xs text-destructive">{state.error}</p>}
        </form>
      )}
    </li>
  )
}
