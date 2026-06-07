"use client"
import { useActionState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createAsset } from "@/modules/asset/actions"
import { ASSET_CATEGORY_OPTIONS } from "@/modules/asset/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const selectClass =
  "mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"

export default function AssetForm() {
  const [state, formAction] = useActionState(createAsset, {})
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
        <CardTitle className="text-base">Tambah Aset</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Aset</Label>
              <Input id="name" name="name" required placeholder="MacBook Pro 14" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Kategori</Label>
              <select id="category" name="category" className={selectClass} defaultValue="laptop">
                {ASSET_CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="serialNumber">Nomor Seri</Label>
              <Input id="serialNumber" name="serialNumber" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Catatan</Label>
              <Input id="notes" name="notes" />
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
