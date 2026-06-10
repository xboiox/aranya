import { NextResponse } from "next/server"
import { auth, hasRole } from "@/lib/auth"
import { getEvidenceMeta } from "@/modules/kpi/queries"
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

  const meta = await getEvidenceMeta(session.user.tenantId, id)
  if (!meta || !meta.evidencePath) {
    return NextResponse.json({ error: "Bukti tidak ditemukan" }, { status: 404 })
  }

  // Otorisasi: pemilik KPI, manajer penetap, atau HR Admin.
  const isOwner = meta.employeeUserId === session.user.id
  const isManager = meta.managerId === session.user.id
  const isHr = hasRole(session.user.roles, "hr_admin")
  if (!isOwner && !isManager && !isHr) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  const buffer = await getObject(meta.evidencePath)
  if (!buffer) {
    return NextResponse.json({ error: "File tidak tersedia" }, { status: 404 })
  }

  const filename = meta.evidenceName ?? "bukti"
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  })
}
