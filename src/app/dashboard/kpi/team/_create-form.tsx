"use client"
import { useActionState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createKpi } from "@/modules/kpi/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Props {
  periodId: string
  employees: { id: string; name: string | null }[]
}

const selectClass =
  "mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"

export default function KpiCreateForm({ periodId, employees }: Props) {
  const [state, formAction, isPending] = useActionState(createKpi, {})
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
        <CardTitle className="text-base">Tambah KPI</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
          <input type="hidden" name="periodId" value={periodId} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="employeeId">Karyawan</Label>
              <select id="employeeId" name="employeeId" className={selectClass} required>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name ?? "—"}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="weight">Bobot (%)</Label>
              <Input id="weight" name="weight" type="number" min={1} max={100} required />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="title">Judul KPI</Label>
            <Input id="title" name="title" required placeholder="mis. Pencapaian omzet" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="target">Target (opsional)</Label>
            <Input id="target" name="target" placeholder="mis. Rp500jt / kuartal" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="description">Deskripsi (opsional)</Label>
            <Input id="description" name="description" />
          </div>

          {state.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
          )}
          <Button type="submit" disabled={isPending}>
            {isPending ? "Menyimpan…" : "Tambah KPI"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
