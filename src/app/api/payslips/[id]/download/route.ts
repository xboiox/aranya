import { NextResponse } from "next/server"
import { auth, hasRole } from "@/lib/auth"
import { getPayslipForDownload } from "@/modules/payslip/queries"
import { getObject } from "@/lib/storage"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const session = await auth()
  if (!session?.user.tenantId) {
    return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 })
  }

  const payslip = await getPayslipForDownload(session.user.tenantId, id)
  if (!payslip) {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 })
  }

  // Otorisasi: pemilik slip ATAU HR Admin
  const isOwner = payslip.employeeUserId === session.user.id
  const isHr = hasRole(session.user.roles, "hr_admin")
  if (!isOwner && !isHr) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  const buffer = await getObject(payslip.storagePath)
  if (!buffer) {
    return NextResponse.json({ error: "File tidak tersedia" }, { status: 404 })
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${payslip.fileName}"`,
      "Cache-Control": "private, no-store",
    },
  })
}
