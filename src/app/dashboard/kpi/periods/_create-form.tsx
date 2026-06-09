"use client"
import { useActionState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createPeriod } from "@/modules/kpi/actions"
import { PERIOD_TYPE_OPTIONS } from "@/modules/kpi/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const selectClass =
  "mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"

export default function PeriodCreateForm() {
  const [state, formAction, isPending] = useActionState(createPeriod, {})
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Buat Periode</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="name">Nama Periode</Label>
              <Input id="name" name="name" required placeholder="KPI Q1 2026" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="type">Tipe</Label>
              <select id="type" name="type" className={selectClass} defaultValue="quarterly">
                {PERIOD_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="startDate">Mulai</Label>
              <Input id="startDate" name="startDate" type="date" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="endDate">Selesai</Label>
              <Input id="endDate" name="endDate" type="date" required />
            </div>
          </div>
          {state.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
          )}
          <Button type="submit" disabled={isPending}>
            {isPending ? "Menyimpan…" : "Buat"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
