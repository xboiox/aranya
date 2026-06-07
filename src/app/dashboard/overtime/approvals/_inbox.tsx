"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { approveOvertime, rejectOvertime } from "@/modules/overtime/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

interface Item {
  id: string
  requesterName: string
  date: string
  time: string
  duration: string
  reason: string | null
}

export default function OvertimeApprovalInbox({ items }: { items: Item[] }) {
  const [pending, startTransition] = useTransition()
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [reason, setReason] = useState("")
  const router = useRouter()

  function run(fn: () => Promise<{ error?: string; success?: string }>) {
    startTransition(async () => {
      const res = await fn()
      if (res.error) toast.error(res.error)
      else {
        toast.success(res.success ?? "Berhasil")
        setRejectingId(null)
        setReason("")
        router.refresh()
      }
    })
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Tidak ada pengajuan menunggu.</p>
  }

  return (
    <div className="space-y-3">
      {items.map((it) => (
        <Card key={it.id}>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="text-sm">
                <p className="font-medium">{it.requesterName}</p>
                <p className="text-muted-foreground">
                  {it.date} · {it.time} · {it.duration}
                </p>
                {it.reason && <p className="mt-1 text-muted-foreground">Ket: {it.reason}</p>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" disabled={pending} onClick={() => run(() => approveOvertime(it.id))}>
                  Setujui
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => setRejectingId(rejectingId === it.id ? null : it.id)}
                >
                  Tolak
                </Button>
              </div>
            </div>
            {rejectingId === it.id && (
              <div className="mt-3 flex gap-2">
                <Input
                  placeholder="Alasan penolakan (opsional)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={pending}
                  onClick={() => run(() => rejectOvertime(it.id, reason))}
                >
                  Konfirmasi Tolak
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
