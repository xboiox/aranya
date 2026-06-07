"use client"
import { useActionState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { requestOvertime } from "@/modules/overtime/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function OvertimeRequestForm() {
  const [state, formAction, isPending] = useActionState(requestOvertime, {})
  const router = useRouter()

  useEffect(() => {
    if (state.success) {
      toast.success(state.success)
      router.refresh()
    }
  }, [state.success, router])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ajukan Lembur</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="date">Tanggal</Label>
              <Input id="date" name="date" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">Jam Mulai</Label>
              <Input id="startTime" name="startTime" type="time" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Jam Selesai</Label>
              <Input id="endTime" name="endTime" type="time" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Keterangan (opsional)</Label>
            <Input id="reason" name="reason" />
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
            Lembur lewat tengah malam dihitung otomatis.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
