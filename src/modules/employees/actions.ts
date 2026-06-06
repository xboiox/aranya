"use server"
import { auth, hasRole } from "@/lib/auth"
import { withTenantContext } from "@/lib/db"
import { users, employees, userRoles, roles, invitations } from "@/lib/db/schema"
import { sendInvitationEmail } from "@/lib/email"
import { logAudit } from "@/lib/audit"
import { employeeCreateSchema, employeeUpdateSchema } from "./schema"
import { eq, and, isNull } from "drizzle-orm"
import { redirect } from "next/navigation"
import crypto from "crypto"

type ActionState = { error?: string }

function toDate(v?: string): Date | null {
  if (!v) return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
}

export async function createEmployee(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth()
  if (!session) return { error: "Tidak terautentikasi" }
  const tenantId = session.user.tenantId
  if (!hasRole(session.user.roles, "hr_admin") || !tenantId) {
    return { error: "Hanya HR Admin yang dapat menambah karyawan" }
  }

  const parsed = employeeCreateSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    role: formData.get("role"),
    position: formData.get("position"),
    department: formData.get("department"),
    contractType: formData.get("contractType"),
    joinDate: formData.get("joinDate"),
    reportsToId: formData.get("reportsToId"),
  })
  if (!parsed.success) return { error: parsed.error.errors[0].message }
  const data = parsed.data

  const token = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const result = await withTenantContext(tenantId, async (tx) => {
    const existingUser = await tx.query.users.findFirst({
      where: eq(users.email, data.email),
    })
    if (existingUser) return { error: "Email ini sudah terdaftar." as string }

    const role = await tx.query.roles.findFirst({
      where: and(eq(roles.name, data.role), isNull(roles.tenantId)),
    })
    if (!role) return { error: `Role ${data.role} tidak ditemukan. Jalankan seed.` }

    // Validasi direct lead harus karyawan di tenant yang sama
    if (data.reportsToId) {
      const lead = await tx.query.employees.findFirst({
        where: eq(employees.id, data.reportsToId),
      })
      if (!lead) return { error: "Direct lead tidak valid." }
    }

    const [user] = await tx
      .insert(users)
      .values({ email: data.email, name: data.name })
      .returning()

    const [employee] = await tx
      .insert(employees)
      .values({
        userId: user.id,
        tenantId,
        position: data.position ?? null,
        department: data.department ?? null,
        contractType: data.contractType ?? null,
        joinDate: toDate(data.joinDate),
        reportsToId: data.reportsToId ?? null,
      })
      .returning()

    await tx.insert(userRoles).values({
      userId: user.id,
      roleId: role.id,
      tenantId,
    })

    await tx.insert(invitations).values({
      tenantId,
      email: data.email,
      roleId: role.id,
      invitedById: session.user.id,
      token,
      expiresAt,
    })

    return { user, employee, email: data.email, name: data.name }
  })

  if ("error" in result) return { error: result.error }

  await logAudit({
    tenantId,
    userId: session.user.id,
    action: "employee.create",
    entityType: "employee",
    entityId: result.employee.id,
    newValues: { email: result.email, name: result.name, role: data.role },
  })

  const inviteUrl = `${process.env.AUTH_URL}/invite/${token}`
  await sendInvitationEmail(
    result.email,
    inviteUrl,
    "perusahaan Anda",
    session.user.name ?? "HR Admin",
  )

  redirect("/dashboard/employees")
}

export async function updateEmployee(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await auth()
  if (!session) return { error: "Tidak terautentikasi" }
  const tenantId = session.user.tenantId
  if (!hasRole(session.user.roles, "hr_admin") || !tenantId) {
    return { error: "Hanya HR Admin yang dapat mengedit karyawan" }
  }

  const parsed = employeeUpdateSchema.safeParse({
    name: formData.get("name"),
    position: formData.get("position"),
    department: formData.get("department"),
    contractType: formData.get("contractType"),
    joinDate: formData.get("joinDate"),
    reportsToId: formData.get("reportsToId"),
    nik: formData.get("nik"),
    npwp: formData.get("npwp"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    bankName: formData.get("bankName"),
    bankAccountNumber: formData.get("bankAccountNumber"),
    bankAccountName: formData.get("bankAccountName"),
    bpjsKesehatan: formData.get("bpjsKesehatan"),
    bpjsKetenagakerjaan: formData.get("bpjsKetenagakerjaan"),
    isActive: formData.get("isActive") === "on",
  })
  if (!parsed.success) return { error: parsed.error.errors[0].message }
  const data = parsed.data

  const result = await withTenantContext(tenantId, async (tx) => {
    const existing = await tx.query.employees.findFirst({
      where: eq(employees.id, id),
    })
    if (!existing) return { error: "Karyawan tidak ditemukan." as string }

    if (data.reportsToId) {
      if (data.reportsToId === id) return { error: "Karyawan tidak bisa melapor ke dirinya sendiri." }
      const lead = await tx.query.employees.findFirst({
        where: eq(employees.id, data.reportsToId),
      })
      if (!lead) return { error: "Direct lead tidak valid." }
    }

    await tx
      .update(employees)
      .set({
        position: data.position ?? null,
        department: data.department ?? null,
        contractType: data.contractType ?? null,
        joinDate: toDate(data.joinDate),
        reportsToId: data.reportsToId ?? null,
        nik: data.nik ?? null,
        npwp: data.npwp ?? null,
        phone: data.phone ?? null,
        address: data.address ?? null,
        bankName: data.bankName ?? null,
        bankAccountNumber: data.bankAccountNumber ?? null,
        bankAccountName: data.bankAccountName ?? null,
        bpjsKesehatan: data.bpjsKesehatan ?? null,
        bpjsKetenagakerjaan: data.bpjsKetenagakerjaan ?? null,
        isActive: data.isActive ?? existing.isActive,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, id))

    // Update nama di tabel users
    await tx.update(users).set({ name: data.name }).where(eq(users.id, existing.userId))

    return { employeeId: id }
  })

  if ("error" in result) return { error: result.error }

  await logAudit({
    tenantId,
    userId: session.user.id,
    action: "employee.update",
    entityType: "employee",
    entityId: id,
  })

  redirect(`/dashboard/employees/${id}`)
}
