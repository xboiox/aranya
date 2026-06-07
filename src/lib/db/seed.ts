// Run with: npm run db:seed
// Seed bootstrap pakai koneksi admin (bukan app role yang dibatasi RLS).
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"
import {
  roles,
  permissions,
  rolePermissions,
  users,
  userRoles,
} from "./schema"
import bcryptjs from "bcryptjs"
import { eq, and, isNull } from "drizzle-orm"

const adminUrl = process.env.ADMIN_DATABASE_URL ?? process.env.DATABASE_URL
if (!adminUrl) throw new Error("ADMIN_DATABASE_URL / DATABASE_URL tidak diset")
const client = postgres(adminUrl, { max: 1 })
const db = drizzle(client, { schema })

const SYSTEM_ROLES = [
  { name: "super_admin", description: "Platform administrator Aranya" },
  { name: "hr_admin",    description: "HR Administrator per perusahaan" },
  { name: "manager",     description: "Manager / atasan langsung" },
  { name: "employee",    description: "Karyawan reguler" },
] as const

const ALL_PERMISSIONS = [
  // Core HR — Modul 1
  { code: "employees:read",      description: "Lihat data karyawan" },
  { code: "employees:write",     description: "Tambah dan edit karyawan" },
  { code: "employees:delete",    description: "Nonaktifkan karyawan" },
  { code: "org:read",            description: "Lihat struktur organisasi" },
  { code: "org:write",           description: "Edit struktur organisasi" },
  { code: "attendance:read",     description: "Lihat data absensi" },
  { code: "attendance:write",    description: "Catat absensi sendiri" },
  { code: "attendance:manage",   description: "Kelola semua absensi" },
  { code: "leave:read",          description: "Lihat pengajuan cuti" },
  { code: "leave:request",       description: "Ajukan cuti" },
  { code: "leave:approve",       description: "Approve / reject cuti bawahan" },
  { code: "leave:manage",        description: "Kelola semua cuti" },
  { code: "overtime:read",       description: "Lihat data lembur" },
  { code: "overtime:request",    description: "Ajukan lembur" },
  { code: "overtime:approve",    description: "Approve / reject lembur bawahan" },
  { code: "payslip:read",        description: "Download slip gaji sendiri" },
  { code: "payslip:manage",      description: "Upload dan kelola semua slip gaji" },
  // HR Operations & Performance Development — Modul 2
  { code: "kpi:read",            description: "Lihat data KPI" },
  { code: "kpi:write",           description: "Isi nilai KPI" },
  { code: "kpi:approve",         description: "Approve / reject KPI bawahan" },
  { code: "bonus:manage",        description: "Kelola formula dan kalkulasi bonus" },
  { code: "discipline:read",     description: "Lihat catatan disiplin" },
  { code: "discipline:manage",   description: "Buat SP dan catatan disiplin" },
  { code: "training:read",       description: "Lihat rencana training" },
  { code: "training:manage",     description: "Kelola training dan sertifikasi" },
  { code: "assets:read",         description: "Lihat aset perusahaan" },
  { code: "assets:manage",       description: "Kelola aset perusahaan" },
  { code: "onboarding:manage",   description: "Kelola proses onboarding / offboarding" },
  { code: "analytics:read",      description: "Lihat HR analytics dashboard" },
  { code: "integrations:manage", description: "Kelola integrasi pihak ketiga" },
  // Payroll & Compliance — Modul 3
  { code: "claims:read",         description: "Lihat pengajuan klaim" },
  { code: "claims:request",      description: "Ajukan klaim" },
  { code: "claims:approve",      description: "Approve / reject klaim bawahan" },
  { code: "payroll:read",        description: "Lihat kalkulasi payroll" },
  { code: "payroll:manage",      description: "Proses dan finalisasi payroll" },
  // Admin
  { code: "tenants:manage",      description: "Kelola tenant (Super Admin only)" },
  { code: "rates:manage",        description: "Kelola tarif PPh21 / BPJS (Super Admin only)" },
  { code: "company:config",      description: "Konfigurasi perusahaan" },
  { code: "invitations:manage",  description: "Kirim undangan pengguna baru" },
]

const SUPER_ADMIN_EXCLUDED: string[] = []
const HR_ADMIN_EXCLUDED = new Set(["tenants:manage", "rates:manage"])
const MANAGER_ALLOWED = new Set([
  "employees:read", "org:read",
  "attendance:read", "attendance:write",
  "leave:read", "leave:request", "leave:approve",
  "overtime:read", "overtime:request", "overtime:approve",
  "payslip:read",
  "claims:read", "claims:request", "claims:approve",
  "kpi:read", "kpi:write", "kpi:approve",
  "payroll:read", "discipline:read",
  "training:read", "assets:read",
  "analytics:read",
])
const EMPLOYEE_ALLOWED = new Set([
  "attendance:write", "attendance:read",
  "leave:read", "leave:request",
  "overtime:read", "overtime:request",
  "payslip:read",
  "claims:read", "claims:request",
  "kpi:read", "kpi:write",
  "org:read", "training:read", "assets:read",
])

async function seed() {
  console.log("🌱 Seeding Aranya database...")

  // 1. Create system roles (tenant_id = null)
  const roleMap = new Map<string, string>()
  for (const r of SYSTEM_ROLES) {
    const existing = await db.query.roles.findFirst({
      where: and(eq(roles.name, r.name), isNull(roles.tenantId)),
    })
    if (existing) {
      roleMap.set(r.name, existing.id)
      console.log(`  Role '${r.name}' already exists`)
    } else {
      const [created] = await db.insert(roles).values({ ...r, tenantId: null }).returning()
      roleMap.set(r.name, created.id)
      console.log(`  Created role '${r.name}'`)
    }
  }

  // 2. Create permissions
  const permMap = new Map<string, string>()
  for (const p of ALL_PERMISSIONS) {
    const existing = await db.query.permissions.findFirst({
      where: eq(permissions.code, p.code),
    })
    if (existing) {
      permMap.set(p.code, existing.id)
    } else {
      const [created] = await db.insert(permissions).values(p).returning()
      permMap.set(p.code, created.id)
    }
  }
  console.log(`  Upserted ${ALL_PERMISSIONS.length} permissions`)

  // 3. Assign permissions to roles
  const assignPerms = async (roleName: string, codes: string[]) => {
    const roleId = roleMap.get(roleName)!
    for (const code of codes) {
      const permId = permMap.get(code)
      if (!permId) continue
      const existing = await db.query.rolePermissions.findFirst({
        where: and(
          eq(rolePermissions.roleId, roleId),
          eq(rolePermissions.permissionId, permId),
        ),
      })
      if (!existing) {
        await db.insert(rolePermissions).values({ roleId, permissionId: permId })
      }
    }
  }

  const allCodes = ALL_PERMISSIONS.map((p) => p.code)
  await assignPerms("super_admin", allCodes.filter((c) => !SUPER_ADMIN_EXCLUDED.includes(c)))
  await assignPerms("hr_admin",    allCodes.filter((c) => !HR_ADMIN_EXCLUDED.has(c)))
  await assignPerms("manager",     allCodes.filter((c) => MANAGER_ALLOWED.has(c)))
  await assignPerms("employee",    allCodes.filter((c) => EMPLOYEE_ALLOWED.has(c)))
  console.log("  Assigned permissions to all roles")

  // 4. Create Super Admin user
  const email = process.env.SUPER_ADMIN_EMAIL
  const password = process.env.SUPER_ADMIN_PASSWORD
  if (!email || !password) {
    console.warn("  ⚠️  SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD not set — skipping user creation")
  } else {
    const existingUser = await db.query.users.findFirst({ where: eq(users.email, email) })
    if (existingUser) {
      console.log(`  Super Admin '${email}' already exists`)
    } else {
      const hashedPassword = await bcryptjs.hash(password, 12)
      const [superAdmin] = await db.insert(users).values({
        email,
        name: "Super Admin",
        password: hashedPassword,
      }).returning()

      const superAdminRoleId = roleMap.get("super_admin")!
      await db.insert(userRoles).values({
        userId: superAdmin.id,
        roleId: superAdminRoleId,
        tenantId: null,
      })
      console.log(`  Created Super Admin: ${email}`)
    }
  }

  console.log("✅ Seed selesai!")
}

seed()
  .catch((err) => { console.error("❌ Seed gagal:", err); process.exit(1) })
  .finally(() => process.exit(0))
