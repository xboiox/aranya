"use server"
import { auth, hasRole } from "@/lib/auth"
import { withTenantContext } from "@/lib/db"
import { payslips, employees } from "@/lib/db/schema"
import { logAudit } from "@/lib/audit"
import { notify } from "@/lib/notifications"
import { putObject, deleteObject } from "@/lib/storage"
import { GCS_PATHS } from "@/lib/gcs"
import { eq, and } from "drizzle-orm"
import { z } from "zod"
import { revalidatePath } from "next/cache"

type State = { error?: string; success?: string }

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

const metaSchema = z.object({
  employeeId: z.string().min(1, "Karyawan wajib dipilih"),
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
})

async function requireHr() {
  const session = await auth()
  if (!session) return { error: "Tidak terautentikasi" as const }
  if (!hasRole(session.user.roles, "hr_admin") || !session.user.tenantId) {
    return { error: "Hanya HR Admin yang dapat mengelola slip gaji" as const }
  }
  return { tenantId: session.user.tenantId, userId: session.user.id }
}

export async function uploadPayslip(_prev: State, formData: FormData): Promise<State> {
  const ctx = await requireHr()
  if ("error" in ctx) return { error: ctx.error }

  const parsed = metaSchema.safeParse({
    employeeId: formData.get("employeeId"),
    year: formData.get("year"),
    month: formData.get("month"),
  })
  if (!parsed.success) return { error: parsed.error.errors[0].message }
  const { employeeId, year, month } = parsed.data

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) return { error: "File PDF wajib diunggah" }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return { error: "File harus berformat PDF" }
  }
  if (file.size > MAX_SIZE) return { error: "Ukuran file maksimal 5 MB" }

  // Verifikasi karyawan ada di tenant
  const emp = await withTenantContext(ctx.tenantId, async (tx) =>
    tx.query.employees.findFirst({ where: eq(employees.id, employeeId) }),
  )
  if (!emp) return { error: "Karyawan tidak ditemukan" }

  const buffer = Buffer.from(await file.arrayBuffer())
  const storagePath = GCS_PATHS.payslip(ctx.tenantId, year, month, employeeId)
  await putObject(storagePath, buffer, "application/pdf")

  await withTenantContext(ctx.tenantId, async (tx) => {
    await tx
      .insert(payslips)
      .values({
        tenantId: ctx.tenantId,
        employeeId,
        year,
        month,
        fileName: `slip-gaji-${year}-${String(month).padStart(2, "0")}.pdf`,
        storagePath,
        uploadedById: ctx.userId,
      })
      .onConflictDoUpdate({
        target: [payslips.employeeId, payslips.year, payslips.month],
        set: { storagePath, uploadedById: ctx.userId, createdAt: new Date() },
      })
  })

  await logAudit({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: "payslip.upload",
    entityType: "payslip",
    entityId: employeeId,
    newValues: { year, month },
  })

  await notify({
    tenantId: ctx.tenantId,
    userId: emp.userId,
    type: "payslip",
    title: "Slip gaji tersedia",
    body: `Slip gaji periode ${String(month).padStart(2, "0")}/${year} sudah dapat diunduh.`,
  })

  revalidatePath("/dashboard/payslip/manage")
  return { success: "Slip gaji berhasil diunggah" }
}

export async function deletePayslip(id: string): Promise<State> {
  const ctx = await requireHr()
  if ("error" in ctx) return { error: ctx.error }

  const removed = await withTenantContext(ctx.tenantId, async (tx) => {
    const row = await tx.query.payslips.findFirst({
      where: and(eq(payslips.id, id), eq(payslips.tenantId, ctx.tenantId)),
    })
    if (!row) return null
    await tx.delete(payslips).where(eq(payslips.id, id))
    return row
  })

  if (!removed) return { error: "Slip gaji tidak ditemukan" }
  await deleteObject(removed.storagePath)

  await logAudit({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: "payslip.delete",
    entityType: "payslip",
    entityId: id,
  })

  revalidatePath("/dashboard/payslip/manage")
  return { success: "Slip gaji dihapus" }
}
