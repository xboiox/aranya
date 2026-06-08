import { NextResponse } from "next/server"
import { auth, hasRole } from "@/lib/auth"
import { EMPLOYEE_CSV_TEMPLATE } from "@/modules/employees/bulk"
import { CSV_BOM } from "@/lib/csv"

export async function GET() {
  const session = await auth()
  if (!session?.user.tenantId) {
    return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 })
  }
  if (!hasRole(session.user.roles, "hr_admin")) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  return new NextResponse(CSV_BOM + EMPLOYEE_CSV_TEMPLATE, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="template-karyawan.csv"',
      "Cache-Control": "private, no-store",
    },
  })
}
