import { NextResponse } from "next/server"
import { auth, hasRole } from "@/lib/auth"
import { listTeamAttendanceRange } from "@/modules/attendance/queries"
import {
  filterTeamRows,
  teamRowsToCsv,
  isTeamStatus,
} from "@/modules/attendance/team-report"
import { todayJakarta, toYMD, parseDateOnly } from "@/lib/date"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user.tenantId) {
    return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 })
  }
  if (!hasRole(session.user.roles, "hr_admin")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  const url = new URL(req.url)
  const today = toYMD(todayJakarta())
  const startStr = url.searchParams.get("startDate") ?? today
  const endStr = url.searchParams.get("endDate") ?? startStr
  let startDate = parseDateOnly(startStr) ?? todayJakarta()
  let endDate = parseDateOnly(endStr) ?? startDate
  if (startDate > endDate) [startDate, endDate] = [endDate, startDate]

  const department = url.searchParams.get("department") || undefined
  const q = url.searchParams.get("q") ?? undefined
  const statusParam = url.searchParams.get("status")
  const status = isTeamStatus(statusParam) ? statusParam : "all"

  const grid = await listTeamAttendanceRange(session.user.tenantId, {
    startDate,
    endDate,
    department,
  })
  const filtered = filterTeamRows(grid, { q, status })
  // BOM agar Excel mengenali UTF-8.
  const csv = "﻿" + teamRowsToCsv(filtered)

  const suffix = toYMD(startDate) === toYMD(endDate)
    ? toYMD(startDate)
    : `${toYMD(startDate)}_sd_${toYMD(endDate)}`

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="absensi-tim-${suffix}.csv"`,
      "Cache-Control": "private, no-store",
    },
  })
}
