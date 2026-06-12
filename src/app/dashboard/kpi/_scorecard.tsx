"use client"
import { useState, useTransition, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  agreeScorecard,
  requestRevisionScorecard,
  addSubtask,
  toggleSubtask,
  deleteSubtask,
  addProgress,
  setRealizationSelf,
} from "@/modules/kpi/actions"
import { SCORECARD_STATUS_LABEL, SCORECARD_STATUS_STYLE, SCORE_LABEL, type ScorecardStatus } from "@/modules/kpi/schema"
import type { RubricLevel } from "@/lib/db/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface TaskView {
  id: string
  title: string
  weight: number
  targetNote: string | null
  rubric: RubricLevel[]
  realization: string | null
  selfScore: number | null
  managerNote: string | null
  finalScore: number | null
  latestPercent: number | null
  subtasks: { id: string; title: string; isDone: boolean }[]
  feedback: { id: string; fromName: string | null; message: string; date: string }[]
}
export interface EpicView { id: string; name: string; weight: number; tasks: TaskView[] }
export interface ScorecardView {
  scorecardId: string
  periodName: string
  periodStatus: string
  status: string
  revisionNote: string | null
  finalTotal: number | null
  epics: EpicView[]
}

type Res = { error?: string; success?: string }

function Rubric({ rubric }: { rubric: RubricLevel[] }) {
  return (
    <ul className="mt-1 text-xs text-muted-foreground">
      {rubric.map((r) => (
        <li key={r.score}>
          <span className="font-medium">{r.score}{r.score === 3 ? " (target)" : ""}:</span> {r.criteria || "—"}
        </li>
      ))}
    </ul>
  )
}

export default function EmployeeScorecard({ view }: { view: ScorecardView }) {
  const [pending, startTransition] = useTransition()
  const [revising, setRevising] = useState(false)
  const [note, setNote] = useState("")
  const router = useRouter()
  const st = view.periodStatus

  function run(fn: () => Promise<Res>, after?: () => void) {
    startTransition(async () => {
      const res = await fn()
      if (res.error) toast.error(res.error)
      else { toast.success(res.success ?? "Berhasil"); after?.(); router.refresh() }
    })
  }
  function submit(fn: (fd: FormData) => Promise<Res>, e: FormEvent<HTMLFormElement>, reset = true) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    run(() => fn(fd), () => reset && form.reset())
  }

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">{view.periodName}</p>
          <p className="text-xs text-muted-foreground">Periode: {st}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SCORECARD_STATUS_STYLE[view.status as ScorecardStatus]}`}>
          {SCORECARD_STATUS_LABEL[view.status as ScorecardStatus]}
        </span>
      </div>

      {st === "locked" && view.finalTotal != null && (
        <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Skor akhir: <span className="text-lg font-bold">{view.finalTotal.toFixed(2)}</span> / 5
        </div>
      )}

      {view.epics.map((e) => (
        <div key={e.id} className="rounded-lg border">
          <div className="flex justify-between border-b bg-muted/40 px-3 py-1.5 text-sm">
            <span className="font-medium">{e.name}</span>
            <span className="text-muted-foreground">Bobot {e.weight}%</span>
          </div>
          <ul className="divide-y">
            {e.tasks.map((t) => (
              <li key={t.id} className="px-3 py-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{t.title}</span>
                  <span className="shrink-0 text-muted-foreground">Bobot {t.weight}%</span>
                </div>
                {t.targetNote && <p className="text-xs text-muted-foreground">Target: {t.targetNote}</p>}

                {/* PLANNING: read-only rubrik */}
                {st === "planning" && <Rubric rubric={t.rubric} />}

                {/* ACTIVE: sub-task + progres */}
                {st === "active" && (
                  <div className="mt-2 space-y-2">
                    {t.latestPercent != null && <p className="text-xs">Progres terakhir: {t.latestPercent}%</p>}
                    {t.feedback.map((f) => (
                      <p key={f.id} className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-900">
                        {f.fromName ?? "Atasan"}: {f.message}
                      </p>
                    ))}
                    <ul className="space-y-1">
                      {t.subtasks.map((s) => (
                        <li key={s.id} className="flex items-center gap-2 text-xs">
                          <input type="checkbox" checked={s.isDone} disabled={pending} onChange={() => run(() => toggleSubtask(s.id))} />
                          <span className={s.isDone ? "line-through text-muted-foreground" : ""}>{s.title}</span>
                          <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => run(() => deleteSubtask(s.id))}>✕</button>
                        </li>
                      ))}
                    </ul>
                    <form onSubmit={(ev) => submit((fd) => addSubtask(t.id, {}, fd), ev)} className="flex gap-1">
                      <Input name="title" placeholder="Tambah sub-task…" className="h-7 text-xs" />
                      <Button size="xs" type="submit" variant="outline" disabled={pending}>+</Button>
                    </form>
                    <form onSubmit={(ev) => submit((fd) => addProgress({}, fd), ev)} className="flex flex-wrap items-end gap-1">
                      <input type="hidden" name="taskId" value={t.id} />
                      <Input name="percent" type="number" min={0} max={100} placeholder="%" className="h-7 w-16 text-xs" required />
                      <Input name="note" placeholder="Catatan" className="h-7 flex-1 text-xs" />
                      <input type="file" name="evidence" accept=".pdf,.png,.jpg,.jpeg,.webp" className="text-[10px]" />
                      <Button size="xs" type="submit" disabled={pending}>Update</Button>
                    </form>
                  </div>
                )}

                {/* APPRAISAL: realization + self score */}
                {st === "appraisal" && (
                  <div className="mt-2">
                    <Rubric rubric={t.rubric} />
                    <form onSubmit={(ev) => submit((fd) => setRealizationSelf({}, fd), ev, false)} className="mt-1 flex flex-wrap items-end gap-1">
                      <input type="hidden" name="taskId" value={t.id} />
                      <Input name="realization" defaultValue={t.realization ?? ""} placeholder="Capaian (realization)" className="h-7 min-w-40 flex-1 text-xs" />
                      <select name="selfScore" defaultValue={t.selfScore ?? ""} required className="h-7 rounded-md border border-input bg-background px-2 text-xs">
                        <option value="" disabled>SE</option>
                        {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                      <Button size="xs" type="submit" disabled={pending}>Simpan</Button>
                    </form>
                  </div>
                )}

                {/* LOCKED: skor final */}
                {st === "locked" && (
                  <p className="mt-1 text-xs">
                    Skor akhir: <span className="font-semibold">{t.finalScore ?? "—"}{t.finalScore != null && ` — ${SCORE_LABEL[t.finalScore]}`}</span>
                    {t.selfScore != null && <span className="ml-2 text-muted-foreground">(nilai diri: {t.selfScore})</span>}
                    {t.managerNote && <span className="ml-2 text-muted-foreground">· {t.managerNote}</span>}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/* Goal agreement (planning + proposed) */}
      {st === "planning" && view.status === "proposed" && (
        <div className="border-t pt-3">
          <div className="flex gap-2">
            <Button size="sm" disabled={pending} onClick={() => run(() => agreeScorecard(view.scorecardId))}>Setujui scorecard</Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => setRevising((v) => !v)}>Minta revisi</Button>
          </div>
          {revising && (
            <div className="mt-2 flex gap-2">
              <Input placeholder="Alasan revisi (opsional)" value={note} onChange={(e) => setNote(e.target.value)} />
              <Button size="sm" variant="destructive" disabled={pending} onClick={() => run(() => requestRevisionScorecard(view.scorecardId, note), () => { setRevising(false); setNote("") })}>Kirim</Button>
            </div>
          )}
        </div>
      )}
      {st === "planning" && view.status === "revision_requested" && view.revisionNote && (
        <p className="text-xs text-muted-foreground">Catatan revisi Anda: {view.revisionNote}</p>
      )}
      {st === "planning" && view.status === "draft" && (
        <p className="text-xs text-muted-foreground">Atasan sedang menyusun scorecard Anda.</p>
      )}
    </div>
  )
}
