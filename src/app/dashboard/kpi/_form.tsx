"use client"
import { useActionState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { submitKpi } from "@/modules/kpi/actions"
import { recentQuarters } from "@/modules/kpi/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const selectClass =
  "mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"

export default function KpiForm() {
  const [state, formAction, isPending] = useActionState(submitKpi, {})
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()
  const quarters = recentQuarters()

  useEffect(() => {
    if (state.success) {
      toast.success(state.success)
      formRef.current?.reset()
      router.refresh()
    }
  }, [state.success, router])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ajukan Penilaian KPI</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="period">Periode</Label>
              <select id="period" name="period" className={selectClass} defaultValue={quarters[0]}>
                {quarters.map((q) => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="score">Nilai (0–100)</Label>
              <Input id="score" name="score" type="number" min={0} max={100} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Catatan (opsional)</Label>
            <Input id="notes" name="notes" placeholder="Capaian utama periode ini" />
          </div>

          {state.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}

          <Button type="submit" disabled={isPending}>
            {isPending ? "Mengirim..." : "Ajukan"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Penilaian yang ditolak dapat diajukan ulang untuk periode yang sama.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
