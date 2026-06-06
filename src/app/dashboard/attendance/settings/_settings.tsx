"use client"
import { useActionState, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  updateGeofencing,
  addGeofenceLocation,
  removeGeofenceLocation,
} from "@/modules/attendance/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2 } from "lucide-react"

interface Location {
  id: string
  name: string
  latitude: number
  longitude: number
  radiusMeters: number
}

export default function GeofenceSettings({
  enabled,
  locations,
}: {
  enabled: boolean
  locations: Location[]
}) {
  const [toggleState, toggleAction] = useActionState(updateGeofencing, {})
  const [addState, addAction] = useActionState(addGeofenceLocation, {})
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const latRef = useRef<HTMLInputElement>(null)
  const lngRef = useRef<HTMLInputElement>(null)
  const [locating, setLocating] = useState(false)

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Browser tidak mendukung GPS")
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (latRef.current) latRef.current.value = String(pos.coords.latitude)
        if (lngRef.current) lngRef.current.value = String(pos.coords.longitude)
        setLocating(false)
        toast.success("Lokasi terisi dari GPS Anda")
      },
      () => {
        setLocating(false)
        toast.error("Gagal mendapatkan lokasi")
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      const res = await removeGeofenceLocation(id)
      if (res.error) toast.error(res.error)
      else {
        toast.success(res.success ?? "Dihapus")
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Toggle geofencing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Geofencing</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={toggleAction} className="flex items-center gap-3">
            <input
              id="enabled"
              name="enabled"
              type="checkbox"
              defaultChecked={enabled}
              className="size-4 rounded border-input"
            />
            <Label htmlFor="enabled" className="font-normal">
              Wajibkan karyawan absen di area kantor (kecuali WFH)
            </Label>
            <Button type="submit" size="sm" className="ml-auto">
              Simpan
            </Button>
          </form>
          {toggleState.success && (
            <p className="mt-2 text-sm text-green-700">{toggleState.success}</p>
          )}
          {toggleState.error && (
            <p className="mt-2 text-sm text-destructive">{toggleState.error}</p>
          )}
        </CardContent>
      </Card>

      {/* Locations list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lokasi Kantor ({locations.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {locations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada lokasi geofence.</p>
          ) : (
            locations.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{l.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.latitude.toFixed(5)}, {l.longitude.toFixed(5)} · radius {l.radiusMeters} m
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={pending}
                  onClick={() => handleRemove(l.id)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Add location */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tambah Lokasi</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Lokasi</Label>
              <Input id="name" name="name" placeholder="Kantor Pusat" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input id="latitude" name="latitude" ref={latRef} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input id="longitude" name="longitude" ref={lngRef} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="radiusMeters">Radius (m)</Label>
                <Input id="radiusMeters" name="radiusMeters" type="number" defaultValue={100} required />
              </div>
            </div>
            <div className="flex gap-3">
              <Button type="submit">Tambah</Button>
              <Button type="button" variant="outline" onClick={useMyLocation} disabled={locating}>
                {locating ? "Mencari..." : "Gunakan lokasi saya"}
              </Button>
            </div>
            {addState.error && (
              <p className="text-sm text-destructive">{addState.error}</p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
