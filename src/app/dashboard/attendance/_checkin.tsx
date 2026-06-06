"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { checkIn, checkOut } from "@/modules/attendance/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { MapPin } from "lucide-react"

interface Props {
  checkedIn: boolean
  checkedOut: boolean
  checkInLabel: string
  checkOutLabel: string
}

function getPosition(): Promise<{
  latitude: number
  longitude: number
  accuracy: number
}> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Browser tidak mendukung GPS"))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? "Izin lokasi ditolak. Aktifkan akses lokasi di browser."
              : "Gagal mendapatkan lokasi GPS",
          ),
        ),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  })
}

export default function CheckInWidget({
  checkedIn,
  checkedOut,
  checkInLabel,
  checkOutLabel,
}: Props) {
  const [isWfh, setIsWfh] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  async function handle(action: "in" | "out") {
    try {
      const coords = await getPosition()
      startTransition(async () => {
        const fn = action === "in" ? checkIn : checkOut
        const res = await fn({ ...coords, isWfh })
        if (res.error) toast.error(res.error)
        else {
          toast.success(res.success ?? "Berhasil")
          router.refresh()
        }
      })
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="size-5" /> Absensi Hari Ini
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-6 text-sm">
          <div>
            <p className="text-muted-foreground">Masuk</p>
            <p className="text-lg font-semibold">{checkedIn ? checkInLabel : "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Keluar</p>
            <p className="text-lg font-semibold">{checkedOut ? checkOutLabel : "—"}</p>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isWfh}
            onChange={(e) => setIsWfh(e.target.checked)}
            className="size-4 rounded border-input"
          />
          <Label className="font-normal">Work From Home (WFH)</Label>
        </label>

        <div className="flex gap-3">
          {!checkedIn ? (
            <Button onClick={() => handle("in")} disabled={pending}>
              {pending ? "Memproses..." : "Check-in"}
            </Button>
          ) : !checkedOut ? (
            <Button onClick={() => handle("out")} disabled={pending} variant="default">
              {pending ? "Memproses..." : "Check-out"}
            </Button>
          ) : (
            <p className="text-sm text-green-700">Absensi hari ini sudah lengkap ✓</p>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Lokasi GPS Anda akan dicatat saat check-in/check-out.
        </p>
      </CardContent>
    </Card>
  )
}
