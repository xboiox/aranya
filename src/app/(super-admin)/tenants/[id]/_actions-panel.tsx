"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  resendInvitation,
  toggleTenantActive,
  deleteTenant,
} from "../actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TenantActionsPanel({
  tenantId,
  tenantName,
  isActive,
  hasPendingInvite,
}: {
  tenantId: string
  tenantName: string
  isActive: boolean
  hasPendingInvite: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [confirmName, setConfirmName] = useState("")
  const [showDelete, setShowDelete] = useState(false)
  const router = useRouter()

  function run(fn: () => Promise<{ error?: string; success?: string }>) {
    startTransition(async () => {
      const res = await fn()
      if (res?.error) toast.error(res.error)
      else if (res?.success) {
        toast.success(res.success)
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tindakan</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            disabled={pending || !hasPendingInvite}
            onClick={() => run(() => resendInvitation(tenantId))}
          >
            Kirim Ulang Undangan
          </Button>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => run(() => toggleTenantActive(tenantId))}
          >
            {isActive ? "Nonaktifkan Tenant" : "Aktifkan Tenant"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Zona Berbahaya</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Menghapus tenant bersifat <strong>permanen</strong> dan menghapus semua datanya
            (karyawan, absensi, cuti). Tidak bisa dibatalkan.
          </p>
          {!showDelete ? (
            <Button variant="destructive" onClick={() => setShowDelete(true)}>
              Hapus Tenant
            </Button>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="confirm">
                Ketik nama tenant <strong>{tenantName}</strong> untuk konfirmasi:
              </Label>
              <Input
                id="confirm"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={tenantName}
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  disabled={pending || confirmName !== tenantName}
                  onClick={() => run(() => deleteTenant(tenantId, confirmName))}
                >
                  Hapus Permanen
                </Button>
                <Button variant="ghost" onClick={() => setShowDelete(false)}>
                  Batal
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
