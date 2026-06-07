"use client"
import { useActionState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createShift, deleteShift } from "@/modules/shift/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2 } from "lucide-react"

interface Shift {
  id: string
  name: string
  startTime: string
  endTime: string
  lateToleranceMinutes: number
}

export default function ShiftManager({ shifts }: { shifts: Shift[] }) {
  const [state, formAction] = useActionState(createShift, {})
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function remove(id: string) {
    startTransition(async () => {
      const res = await deleteShift(id)
      if (res.error) toast.error(res.error)
      else {
        toast.success(res.success ?? "Dihapus")
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Shift ({shifts.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {shifts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada shift.</p>
          ) : (
            shifts.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.startTime}–{s.endTime} · toleransi {s.lateToleranceMinutes} mnt
                  </p>
                </div>
                <Button variant="ghost" size="icon-sm" disabled={pending} onClick={() => remove(s.id)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tambah Shift</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Shift</Label>
              <Input id="name" name="name" placeholder="Pagi" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="startTime">Jam Mulai</Label>
                <Input id="startTime" name="startTime" type="time" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">Jam Selesai</Label>
                <Input id="endTime" name="endTime" type="time" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lateToleranceMinutes">Toleransi (mnt)</Label>
                <Input id="lateToleranceMinutes" name="lateToleranceMinutes" type="number" defaultValue={0} min={0} max={120} />
              </div>
            </div>
            {state.error && <p className="text-sm text-destructive">{state.error}</p>}
            <Button type="submit">Tambah</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
