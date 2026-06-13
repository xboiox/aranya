"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { correctAttendance } from "@/modules/attendance/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { TableCell, TableRow } from "@/components/ui/table"

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
    <TableRow>
      <TableCell className="whitespace-nowrap text-muted-foreground">{dateDisplay}</TableCell>
      <TableCell>
        {name ?? "—"}
        {isLate && (
          <Badge variant="destructive" className="ml-1.5">Terlambat</Badge>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">{department ?? "—"}</TableCell>
      <TableCell>
        <Input type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="w-28" />
      </TableCell>
      <TableCell>
        <Input type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="w-28" />
      </TableCell>
      <TableCell className="text-right">
        <Button size="xs" variant="outline" disabled={pending || !dirty} onClick={save}>
          Simpan
        </Button>
      </TableCell>
    </TableRow>
  )
}
