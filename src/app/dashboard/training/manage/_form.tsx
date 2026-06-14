"use client"
import { useActionState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createTraining } from "@/modules/training/actions"
import { TRAINING_TYPE_OPTIONS } from "@/modules/training/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TrainingForm({
  employees,
}: {
  employees: { id: string; name: string | null }[]
}) {
  const [state, formAction] = useActionState(createTraining, {})
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
        <CardTitle className="text-base">Tambah Training / Sertifikasi</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="employeeId">Karyawan</Label>
              <Select id="employeeId" name="employeeId" className="w-full" required defaultValue="">
                <option value="" disabled>— Pilih —</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name ?? "—"}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Jenis</Label>
              <Select id="type" name="type" className="w-full" defaultValue="training">
                {TRAINING_TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Judul</Label>
            <Input id="title" name="title" required placeholder="Sertifikasi K3 Umum" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="provider">Penyelenggara</Label>
              <Input id="provider" name="provider" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select id="status" name="status" className="w-full" defaultValue="completed">
                <option value="planned">Direncanakan</option>
                <option value="ongoing">Berlangsung</option>
                <option value="completed">Selesai</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="completionDate">Tanggal Selesai</Label>
              <Input id="completionDate" name="completionDate" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiryDate">Berlaku s/d (sertifikasi)</Label>
              <Input id="expiryDate" name="expiryDate" type="date" />
            </div>
          </div>

          {state.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
          )}
          <Button type="submit">Tambah</Button>
        </form>
      </CardContent>
    </Card>
  )
}
