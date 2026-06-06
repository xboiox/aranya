"use client"
import { useActionState } from "react"
import { resetUserTwoFactor } from "@/modules/security/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function ResetTwoFactorForm() {
  const [state, formAction, isPending] = useActionState(resetUserTwoFactor, {})

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset 2FA Karyawan</CardTitle>
        <CardDescription>
          Masukkan email karyawan. Record 2FA akan dihapus dan mereka akan diminta
          mendaftar ulang saat login berikutnya.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Karyawan</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="karyawan@perusahaan.com"
            />
          </div>

          {state.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}
          {state.success && (
            <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
              {state.success}
            </p>
          )}

          <Button type="submit" disabled={isPending} variant="destructive">
            {isPending ? "Memproses..." : "Reset 2FA"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
