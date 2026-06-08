import { NextResponse } from "next/server"
import { auth, hasRole } from "@/lib/auth"
import { listTeamAttendance } from "@/modules/attendance/queries"
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
  const dateStr = url.searchParams.get("date") ?? toYMD(todayJakarta())
  const date = parseDateOnly(dateStr) ?? todayJakarta()
  const q = url.searchParams.get("q") ?? undefined
  const statusParam = url.searchParams.get("status")
  const status = isTeamStatus(statusParam) ? statusParam : "all"

  const rows = await listTeamAttendance(session.user.tenantId, date)
  const filtered = filterTeamRows(rows, { q, status })
  // BOM agar Excel mengenali UTF-8.
  const csv = "﻿" + teamRowsToCsv(filtered, dateStr)

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="absensi-tim-${dateStr}.csv"`,
      "Cache-Control": "private, no-store",
    },
  })
}
