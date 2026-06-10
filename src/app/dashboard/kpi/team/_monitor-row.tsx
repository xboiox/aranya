"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { addFeedback } from "@/modules/kpi/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ProgressItem {
  id: string
  percent: number
  note: string | null
  evidenceName: string | null
  hasEvidence: boolean
  date: string
}
interface FeedbackItem {
  id: string
  fromName: string | null
  message: string
  date: string
}

interface Props {
  id: string
  title: string
  weight: number
  target: string | null
  latestPercent: number
  isRed: boolean
  progress: ProgressItem[]
  feedback: FeedbackItem[]
}

export default function KpiMonitorRow({
  id,
  title,
  weight,
  target,
  latestPercent,
  isRed,
  progress,
  feedback,
}: Props) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState("")
  const router = useRouter()

  function sendFeedback() {
    if (!message.trim()) return
    startTransition(async () => {
      const res = await addFeedback(id, message)
      if (res.error) toast.error(res.error)
      else {
        toast.success(res.success ?? "Terkirim")
        setMessage("")
        router.refresh()
      }
    })
  }

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">
            Bobot {weight}%{target ? ` · Target: ${target}` : ""}
          </p>
        </div>
        <div className="text-right">
          <span className={`text-sm font-semibold ${isRed ? "text-red-600" : "text-emerald-600"}`}>
            {latestPercent}%
          </span>
          {isRed && (
            <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
              Perlu perhatian
            </span>
          )}
        </div>
      </div>

      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${isRed ? "bg-red-500" : "bg-emerald-500"}`}
          style={{ width: `${latestPercent}%` }}
        />
      </div>

      {progress.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          {progress.slice(0, 3).map((p) => (
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

      {feedback.length > 0 && (
        <ul className="mt-2 space-y-1">
          {feedback.map((f) => (
            <li key={f.id} className="rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-900">
              <span className="font-medium">{f.fromName ?? "Anda"}:</span> {f.message}
              <span className="ml-1 text-blue-500">· {f.date}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex gap-2">
        <Input
          placeholder="Beri feedback…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-1"
        />
        <Button size="sm" variant="outline" disabled={pending || !message.trim()} onClick={sendFeedback}>
          Kirim
        </Button>
      </div>
    </li>
  )
}
