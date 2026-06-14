"use client"
import { useActionState } from "react"
import Link from "next/link"
import { createEmployee } from "@/modules/employees/actions"
import { CONTRACT_TYPE_OPTIONS } from "@/modules/employees/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"

interface Lead {
  id: string
  name: string | null
  position: string | null
}


export default function EmployeeCreateForm({ leads }: { leads: Lead[] }) {
  const [state, formAction, isPending] = useActionState(createEmployee, {})

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Lengkap *</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select id="role" name="role" required className="w-full" defaultValue="employee">
                <option value="employee">Karyawan</option>
                <option value="manager">Manager</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reportsToId">Atasan Langsung</Label>
              <Select id="reportsToId" name="reportsToId" className="w-full" defaultValue="">
                <option value="">— Tidak ada —</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name ?? "—"} {l.position ? `(${l.position})` : ""}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Jabatan</Label>
              <Input id="position" name="position" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Departemen</Label>
              <Input id="department" name="department" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractType">Tipe Kontrak</Label>
              <Select id="contractType" name="contractType" className="w-full" defaultValue="">
                <option value="">— Pilih —</option>
                {CONTRACT_TYPE_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="joinDate">Tanggal Bergabung</Label>
              <Input id="joinDate" name="joinDate" type="date" />
            </div>
          </div>

          {state?.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Menyimpan..." : "Simpan & Kirim Undangan"}
            </Button>
            <Button variant="outline" render={<Link href="/dashboard/employees" />}>
              Batal
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
