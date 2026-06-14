"use client"
import { useActionState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { uploadPayslip } from "@/modules/payslip/actions"
import { MONTH_NAMES } from "@/modules/payslip/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function PayslipUploadForm({
  employees,
}: {
  employees: { id: string; name: string | null }[]
}) {
  const [state, formAction, isPending] = useActionState(uploadPayslip, {})
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()
  const now = new Date()

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
        <CardTitle className="text-base">Unggah Slip Gaji</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="employeeId">Karyawan</Label>
            <Select id="employeeId" name="employeeId" className="w-full" required defaultValue="">
              <option value="" disabled>— Pilih karyawan —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name ?? "—"}</option>
              ))}
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="month">Bulan</Label>
              <Select id="month" name="month" className="w-full" defaultValue={now.getMonth() + 1}>
                {MONTH_NAMES.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Tahun</Label>
              <Input id="year" name="year" type="number" defaultValue={now.getFullYear()} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="file">File PDF (maks 5 MB)</Label>
            <Input id="file" name="file" type="file" accept="application/pdf" required />
          </div>

          {state.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
          )}

          <Button type="submit" disabled={isPending}>
            {isPending ? "Mengunggah..." : "Unggah"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
