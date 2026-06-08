import { NextResponse } from "next/server"
import { auth, hasRole } from "@/lib/auth"
import { listEmployees } from "@/modules/employees/queries"
import { employeesToCsv } from "@/modules/employees/csv"
import { CSV_BOM } from "@/lib/csv"
import { toYMD, todayJakarta } from "@/lib/date"

export async function GET() {
  const session = await auth()
  if (!session?.user.tenantId) {
    return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 })
  }
  if (!hasRole(session.user.roles, "hr_admin")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  const employees = await listEmployees(session.user.tenantId)
  const csv = CSV_BOM + employeesToCsv(employees)

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="karyawan-${toYMD(todayJakarta())}.csv"`,
      "Cache-Control": "private, no-store",
    },
  })
}
