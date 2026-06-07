"use client"
import { useActionState } from "react"
import Link from "next/link"
import { updateEmployee } from "@/modules/employees/actions"
import { CONTRACT_TYPE_OPTIONS } from "@/modules/employees/schema"
import type { EmployeeDetail } from "@/modules/employees/queries"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface Lead {
  id: string
  name: string | null
  position: string | null
}

interface Shift {
  id: string
  name: string
  startTime: string
  endTime: string
}

const selectClass =
  "mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"

function dateValue(d: Date | null): string {
  if (!d) return ""
  return new Date(d).toISOString().slice(0, 10)
}

export default function EmployeeEditForm({
  employee,
  leads,
  shifts,
}: {
  employee: EmployeeDetail
  leads: Lead[]
  shifts: Shift[]
}) {
  const action = updateEmployee.bind(null, employee.id)
  const [state, formAction, isPending] = useActionState(action, {})

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Kepegawaian</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nama Lengkap *</Label>
            <Input id="name" name="name" defaultValue={employee.name ?? ""} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reportsToId">Atasan Langsung</Label>
            <select id="reportsToId" name="reportsToId" className={selectClass} defaultValue={employee.reportsToId ?? ""}>
              <option value="">— Tidak ada —</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name ?? "—"} {l.position ? `(${l.position})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="position">Jabatan</Label>
            <Input id="position" name="position" defaultValue={employee.position ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="department">Departemen</Label>
            <Input id="department" name="department" defaultValue={employee.department ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contractType">Tipe Kontrak</Label>
            <select id="contractType" name="contractType" className={selectClass} defaultValue={employee.contractType ?? ""}>
              <option value="">— Pilih —</option>
              {CONTRACT_TYPE_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="joinDate">Tanggal Bergabung</Label>
            <Input id="joinDate" name="joinDate" type="date" defaultValue={dateValue(employee.joinDate)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="defaultShiftId">Shift Kerja</Label>
            <select id="defaultShiftId" name="defaultShiftId" className={selectClass} defaultValue={employee.defaultShiftId ?? ""}>
              <option value="">— Tidak ada —</option>
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.startTime}–{s.endTime})
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Pribadi & Bank</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="nik">NIK</Label>
            <Input id="nik" name="nik" defaultValue={employee.nik ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="npwp">NPWP</Label>
            <Input id="npwp" name="npwp" defaultValue={employee.npwp ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">No. Telepon</Label>
            <Input id="phone" name="phone" defaultValue={employee.phone ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Alamat</Label>
            <Input id="address" name="address" defaultValue={employee.address ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bankName">Nama Bank</Label>
            <Input id="bankName" name="bankName" defaultValue={employee.bankName ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bankAccountNumber">No. Rekening</Label>
            <Input id="bankAccountNumber" name="bankAccountNumber" defaultValue={employee.bankAccountNumber ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bankAccountName">Nama Pemilik Rekening</Label>
            <Input id="bankAccountName" name="bankAccountName" defaultValue={employee.bankAccountName ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bpjsKesehatan">BPJS Kesehatan</Label>
            <Input id="bpjsKesehatan" name="bpjsKesehatan" defaultValue={employee.bpjsKesehatan ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bpjsKetenagakerjaan">BPJS Ketenagakerjaan</Label>
            <Input id="bpjsKetenagakerjaan" name="bpjsKetenagakerjaan" defaultValue={employee.bpjsKetenagakerjaan ?? ""} />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input
              id="isActive"
              name="isActive"
              type="checkbox"
              defaultChecked={employee.isActive}
              className="size-4 rounded border-input"
            />
            <Label htmlFor="isActive">Karyawan aktif</Label>
          </div>
        </CardContent>
      </Card>

      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Menyimpan..." : "Simpan Perubahan"}
        </Button>
        <Button variant="outline" render={<Link href="/dashboard/employees" />}>
          Batal
        </Button>
      </div>
    </form>
  )
}
