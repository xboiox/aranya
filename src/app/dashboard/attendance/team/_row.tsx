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
  department: string | null
  dateStr: string
  dateDisplay: string
  initialCheckIn: string
  initialCheckOut: string
  isLate: boolean | null
}

export default function AttendanceCorrectionRow({
  employeeId,
  name,
  department,
  dateStr,
  dateDisplay,
  initialCheckIn,
  initialCheckOut,
  isLate,
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
      <td className="px-4 py-2 text-sm whitespace-nowrap text-muted-foreground">{dateDisplay}</td>
      <td className="px-4 py-2 text-sm">
        {name ?? "—"}
        {isLate && (
          <span className="ml-1 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
            Terlambat
          </span>
        )}
      </td>
      <td className="px-4 py-2 text-sm text-muted-foreground">{department ?? "—"}</td>
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
