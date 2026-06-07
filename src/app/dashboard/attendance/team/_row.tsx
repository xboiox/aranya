"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { correctAttendance } from "@/modules/attendance/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Props {
  employeeId: string
  name: string | null
  dateStr: string
  initialCheckIn: string
  initialCheckOut: string
}

export default function AttendanceCorrectionRow({
  employeeId,
  name,
  dateStr,
  initialCheckIn,
  initialCheckOut,
}: Props) {
  const [checkIn, setCheckIn] = useState(initialCheckIn)
  const [checkOut, setCheckOut] = useState(initialCheckOut)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const dirty = checkIn !== initialCheckIn || checkOut !== initialCheckOut

  function save() {
    startTransition(async () => {
      const res = await correctAttendance(employeeId, dateStr, checkIn, checkOut)
      if (res.error) toast.error(res.error)
      else {
        toast.success(res.success ?? "Tersimpan")
        router.refresh()
      }
    })
  }

  return (
    <tr>
      <td className="px-4 py-2 text-sm">{name ?? "—"}</td>
      <td className="px-4 py-2">
        <Input type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="w-28" />
      </td>
      <td className="px-4 py-2">
        <Input type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="w-28" />
      </td>
      <td className="px-4 py-2 text-right">
        <Button size="xs" variant="outline" disabled={pending || !dirty} onClick={save}>
          Simpan
        </Button>
      </td>
    </tr>
  )
}
