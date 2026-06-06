"use client"
import { useActionState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { setAnnualQuota } from "@/modules/leave/actions"
import { addHoliday, removeHoliday } from "@/modules/holidays/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2 } from "lucide-react"

interface Holiday {
  id: string
  name: string
  date: string
  isRecurring: boolean
  isNational: boolean
}

export default function LeaveSettings({
  quota,
  holidays,
}: {
  quota: number
  holidays: Holiday[]
}) {
  const [quotaState, quotaAction] = useActionState(setAnnualQuota, {})
  const [holidayState, holidayAction] = useActionState(addHoliday, {})
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleRemove(id: string) {
    startTransition(async () => {
      const res = await removeHoliday(id)
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
          <CardTitle className="text-base">Kuota Cuti Tahunan</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={quotaAction} className="flex items-end gap-3">
            <div className="space-y-2">
              <Label htmlFor="quota">Jumlah hari per tahun</Label>
              <Input
                id="quota"
                name="quota"
                type="number"
                min={0}
                max={365}
                defaultValue={quota}
                className="w-32"
              />
            </div>
            <Button type="submit">Simpan</Button>
          </form>
          {quotaState.success && <p className="mt-2 text-sm text-green-700">{quotaState.success}</p>}
          {quotaState.error && <p className="mt-2 text-sm text-destructive">{quotaState.error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hari Libur ({holidays.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {holidays.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada hari libur.</p>
          ) : (
            holidays.map((h) => (
              <div key={h.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">
                    {h.name}{" "}
                    {h.isRecurring && <span className="text-xs text-muted-foreground">(tahunan)</span>}
                    {h.isNational && <span className="ml-1 text-xs text-blue-600">nasional</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{h.date}</p>
                </div>
                {!h.isNational && (
                  <Button variant="ghost" size="icon-sm" disabled={pending} onClick={() => handleRemove(h.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tambah Hari Libur</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={holidayAction} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nama</Label>
                <Input id="name" name="name" placeholder="Cuti Bersama" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Tanggal</Label>
                <Input id="date" name="date" type="date" required />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isRecurring" className="size-4 rounded border-input" />
              <span>Berulang setiap tahun</span>
            </label>
            <Button type="submit">Tambah</Button>
            {holidayState.error && <p className="text-sm text-destructive">{holidayState.error}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
