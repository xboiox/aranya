"use client"
import { useState, useTransition, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  createEpic, deleteEpic, createTask, deleteTask, sendScorecard,
  addFeedback, setManagerScore, calibrateFinalScore,
} from "@/modules/kpi/actions"
import { SCORE_LABEL } from "@/modules/kpi/schema"
import type { RubricLevel } from "@/lib/db/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface TaskV {
  id: string; title: string; weight: number; targetNote: string | null; rubric: RubricLevel[]
  realization: string | null; selfScore: number | null; managerScore: number | null
  managerNote: string | null; notesOnAchievement: string | null; finalScore: number | null
  latestPercent: number | null; feedback: { id: string; fromName: string | null; message: string; date: string }[]
}
interface EpicV { id: string; name: string; weight: number; taskTotal: number; tasks: TaskV[] }
export interface MgrView {
  scorecardId: string; periodStatus: string; status: string; revisionNote: string | null
  isHr: boolean; weightProblems: string[]; finalTotal: number | null; epics: EpicV[]
}
type Res = { error?: string; success?: string }

function FeedbackForm({ taskId, run, pending }: { taskId: string; run: (fn: () => Promise<Res>) => void; pending: boolean }) {
  const [msg, setMsg] = useState("")
  return (
    <div className="mt-1 flex gap-1">
      <Input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Feedback…" className="h-7 flex-1 text-xs" />
      <Button size="xs" variant="outline" disabled={pending || !msg.trim()} onClick={() => run(() => addFeedback(taskId, msg))}>Kirim</Button>
    </div>
  )
}

export default function ManagerScorecard({ view }: { view: MgrView }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const sc = view.scorecardId
  const st = view.periodStatus
  const editing = st === "planning" && (view.status === "draft" || view.status === "revision_requested")

  function run(fn: () => Promise<Res>, after?: () => void) {
    startTransition(async () => {
      const res = await fn()
      if (res.error) toast.error(res.error)
      else { toast.success(res.success ?? "Berhasil"); after?.(); router.refresh() }
    })
  }
  function submit(fn: (fd: FormData) => Promise<Res>, e: FormEvent<HTMLFormElement>, reset = true) {
    e.preventDefault(); const form = e.currentTarget; const fd = new FormData(form)
    run(() => fn(fd), () => reset && form.reset())
  }

  return (
    <div className="space-y-4">
      {view.status === "revision_requested" && view.revisionNote && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">Karyawan minta revisi: {view.revisionNote}</p>
      )}
      {st === "planning" && view.status === "proposed" && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">Menunggu persetujuan karyawan.</p>
      )}
      {editing && view.weightProblems.length > 0 && (
        <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <p className="font-medium">Belum siap dikirim:</p>
          <ul className="list-inside list-disc">{view.weightProblems.map((p, i) => <li key={i}>{p}</li>)}</ul>
        </div>
      )}
      {st === "locked" && view.finalTotal != null && (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">Skor akhir: <span className="text-lg font-bold">{view.finalTotal.toFixed(2)}</span> / 5</div>
      )}

      {view.epics.map((e) => (
        <div key={e.id} className="rounded-lg border">
          <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-1.5 text-sm">
            <span className="font-medium">{e.name} <span className="text-muted-foreground">(bobot {e.weight}%)</span></span>
            <div className="flex items-center gap-2">
              <span className={`text-xs ${e.taskTotal === 100 ? "text-emerald-600" : "text-amber-600"}`}>Task {e.taskTotal}%</span>
              {editing && <button className="text-xs text-muted-foreground hover:text-destructive" onClick={() => run(() => deleteEpic(e.id, sc))}>hapus epic</button>}
            </div>
          </div>
          <ul className="divide-y">
            {e.tasks.map((t) => (
              <li key={t.id} className="px-3 py-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{t.title} <span className="text-muted-foreground">({t.weight}%)</span></span>
                  {editing && <button className="shrink-0 text-xs text-muted-foreground hover:text-destructive" onClick={() => run(() => deleteTask(t.id, sc))}>hapus</button>}
                </div>
                {t.targetNote && <p className="text-xs text-muted-foreground">Target: {t.targetNote}</p>}

                {st === "active" && (
                  <div className="mt-1 space-y-1">
                    {t.latestPercent != null && <p className="text-xs">Progres: {t.latestPercent}%</p>}
                    {t.feedback.map((f) => <p key={f.id} className="text-xs text-muted-foreground">• {f.message}</p>)}
                    <FeedbackForm taskId={t.id} run={run} pending={pending} />
                  </div>
                )}

                {st === "appraisal" && (
                  <div className="mt-1 space-y-1">
                    <p className="text-xs text-muted-foreground">Capaian karyawan: {t.realization ?? "—"} · nilai diri: {t.selfScore ?? "—"}</p>
                    <ul className="text-xs text-muted-foreground">{t.rubric.map((r) => <li key={r.score}>{r.score}: {r.criteria || "—"}</li>)}</ul>
                    <form onSubmit={(ev) => submit((fd) => setManagerScore({}, fd), ev, false)} className="flex flex-wrap items-end gap-1">
                      <input type="hidden" name="taskId" value={t.id} />
                      <select name="managerScore" defaultValue={t.managerScore ?? ""} required className="h-7 rounded-md border border-input bg-background px-2 text-xs">
                        <option value="" disabled>Nilai</option>
                        {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                      <Input name="managerNote" defaultValue={t.managerNote ?? ""} placeholder="Catatan manajer" className="h-7 min-w-32 flex-1 text-xs" />
                      <Input name="notesOnAchievement" defaultValue={t.notesOnAchievement ?? ""} placeholder="Notes on achievement" className="h-7 min-w-32 flex-1 text-xs" />
                      <Button size="xs" type="submit" disabled={pending}>Simpan</Button>
                    </form>
                  </div>
                )}

                {st === "locked" && (
                  <div className="mt-1 text-xs">
                    <p>Final: <span className="font-semibold">{t.finalScore ?? "—"}{t.finalScore != null && ` — ${SCORE_LABEL[t.finalScore]}`}</span> <span className="text-muted-foreground">(diri {t.selfScore ?? "—"}, manajer {t.managerScore ?? "—"})</span></p>
                    {view.isHr && (
                      <form onSubmit={(ev) => submit((fd) => calibrateFinalScore({}, fd), ev, false)} className="mt-1 flex items-center gap-1">
                        <input type="hidden" name="taskId" value={t.id} />
                        <span className="text-muted-foreground">Kalibrasi:</span>
                        <select name="finalScore" defaultValue={t.finalScore ?? ""} required className="h-7 rounded-md border border-input bg-background px-2 text-xs">
                          <option value="" disabled>Skor</option>
                          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <Button size="xs" variant="outline" type="submit" disabled={pending}>Simpan</Button>
                      </form>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>

          {editing && (
            <form onSubmit={(ev) => submit((fd) => createTask(e.id, sc, {}, fd), ev)} className="space-y-1 border-t p-2">
              <div className="flex flex-wrap gap-1">
                <Input name="title" placeholder="Judul Task" className="h-7 min-w-40 flex-1 text-xs" required />
                <Input name="weight" type="number" min={1} max={100} placeholder="bobot%" className="h-7 w-20 text-xs" required />
                <Input name="targetNote" placeholder="Notes on KPI Target" className="h-7 min-w-32 flex-1 text-xs" />
              </div>
              <div className="grid gap-1 sm:grid-cols-5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Input key={n} name={`rubric_${n}`} placeholder={`Skor ${n}${n === 3 ? " (target)" : ""}`} className="h-7 text-xs" />
                ))}
              </div>
              <Button size="xs" type="submit" variant="outline" disabled={pending}>+ Task</Button>
            </form>
          )}
        </div>
      ))}

      {editing && (
        <>
          <form onSubmit={(ev) => submit((fd) => createEpic(sc, {}, fd), ev)} className="flex gap-1 rounded-lg border p-2">
            <Input name="name" placeholder="Nama Epic baru" className="h-8 flex-1 text-sm" required />
            <Input name="weight" type="number" min={1} max={100} placeholder="bobot%" className="h-8 w-24 text-sm" required />
            <Button size="sm" type="submit" variant="outline" disabled={pending}>+ Epic</Button>
          </form>
          <Button disabled={pending} onClick={() => run(() => sendScorecard(sc))}>Kirim ke karyawan</Button>
        </>
      )}
    </div>
  )
}
