"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { agreeKpi, requestRevisionKpi } from "@/modules/kpi/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function KpiAgreement({ kpiId }: { kpiId: string }) {
  const [pending, startTransition] = useTransition()
  const [revising, setRevising] = useState(false)
  const [note, setNote] = useState("")
  const router = useRouter()

  function run(fn: () => Promise<{ error?: string; success?: string }>) {
    startTransition(async () => {
      const res = await fn()
      if (res.error) toast.error(res.error)
      else {
        toast.success(res.success ?? "Berhasil")
        setRevising(false)
        setNote("")
        router.refresh()
      }
    })
  }

  return (
    <div className="mt-3 border-t pt-3">
      <div className="flex gap-2">
        <Button size="sm" disabled={pending} onClick={() => run(() => agreeKpi(kpiId))}>
          Setujui
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setRevising((v) => !v)}>
          Minta revisi
        </Button>
      </div>
      {revising && (
        <div className="mt-2 flex gap-2">
          <Input
            placeholder="Alasan / usulan revisi (opsional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() => run(() => requestRevisionKpi(kpiId, note))}
          >
            Kirim
          </Button>
        </div>
      )}
    </div>
  )
}
