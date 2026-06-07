// Run with: npm run db:seed:demo
// Membuat tenant demo lengkap (HR + manager + karyawan + hari libur) agar
// alur aplikasi bisa langsung dites. Idempotent: skip jika slug demo sudah ada.
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"
import {
  tenants,
  tenantModules,
  tenantConfig,
  roles,
  users,
  employees,
  userRoles,
  holidays,
  ANNUAL_LEAVE_QUOTA_KEY,
} from "./schema"
import bcryptjs from "bcryptjs"
import { eq, and, isNull } from "drizzle-orm"

const adminUrl = process.env.ADMIN_DATABASE_URL ?? process.env.DATABASE_URL
if (!adminUrl) throw new Error("ADMIN_DATABASE_URL / DATABASE_URL tidak diset")
const client = postgres(adminUrl, { max: 1 })
const db = drizzle(client, { schema })

const SLUG = "demo-aranya"
const PASSWORD = "Demo1234!"

async function roleId(name: string): Promise<string> {
  const r = await db.query.roles.findFirst({
    where: and(eq(roles.name, name), isNull(roles.tenantId)),
  })
  if (!r) throw new Error(`Role '${name}' tidak ditemukan. Jalankan 'npm run db:seed' dulu.`)
  return r.id
}

async function createMember(
  tenantId: string,
  email: string,
  name: string,
  roleName: string,
  reportsToId: string | null,
  extra: Partial<typeof employees.$inferInsert> = {},
) {
  const hashed = await bcryptjs.hash(PASSWORD, 12)
  const [user] = await db
    .insert(users)
    .values({ email, name, password: hashed })
    .returning()
  const [emp] = await db
    .insert(employees)
    .values({ userId: user.id, tenantId, reportsToId, ...extra })
    .returning()
  await db.insert(userRoles).values({ userId: user.id, roleId: await roleId(roleName), tenantId })
  return emp
}

async function main() {
  console.log("🌱 Seeding tenant demo...")

  const existing = await db.query.tenants.findFirst({ where: eq(tenants.slug, SLUG) })
  if (existing) {
    console.log(`  Tenant '${SLUG}' sudah ada — skip. (Hapus dulu via UI jika ingin re-seed.)`)
    process.exit(0)
  }

  const [tenant] = await db
    .insert(tenants)
    .values({ name: "PT Demo Aranya", slug: SLUG, isActive: true, subscriptionStatus: "trial" })
    .returning()

  // Aktifkan semua modul untuk demo
  await db.insert(tenantModules).values(
    ["MODULE_1", "MODULE_2", "MODULE_3"].map((moduleCode) => ({
      tenantId: tenant.id,
      moduleCode,
      isActive: true,
      activatedAt: new Date(),
    })),
  )

  // Kuota cuti tahunan
  await db.insert(tenantConfig).values({
    tenantId: tenant.id,
    key: ANNUAL_LEAVE_QUOTA_KEY,
    value: "12",
  })

  // HR Admin
  await createMember(tenant.id, "hr@demo.aranya", "Dewi HR", "hr_admin", null, {
    position: "HR Manager",
    department: "Human Resources",
  })

  // Manager (atasan)
  const manager = await createMember(
    tenant.id,
    "manager@demo.aranya",
    "Andi Manager",
    "manager",
    null,
    { position: "Engineering Manager", department: "Engineering" },
  )

  // 2 karyawan melapor ke manager
  await createMember(tenant.id, "budi@demo.aranya", "Budi Santoso", "employee", manager.id, {
    position: "Software Engineer",
    department: "Engineering",
  })
  await createMember(tenant.id, "siti@demo.aranya", "Siti Rahma", "employee", manager.id, {
    position: "Software Engineer",
    department: "Engineering",
  })

  // Beberapa hari libur (recurring nasional contoh)
  const y = new Date().getUTCFullYear()
  await db.insert(holidays).values([
    { tenantId: tenant.id, name: "Tahun Baru", date: new Date(`${y}-01-01T00:00:00Z`), isRecurring: true },
    { tenantId: tenant.id, name: "Hari Kemerdekaan", date: new Date(`${y}-08-17T00:00:00Z`), isRecurring: true },
  ])

  console.log("✅ Demo tenant siap!\n")
  console.log("   Tenant: PT Demo Aranya (slug: demo-aranya) — semua modul aktif")
  console.log(`   Login (password semua: ${PASSWORD}):`)
  console.log("     - HR Admin : hr@demo.aranya        (wajib setup 2FA saat login)")
  console.log("     - Manager  : manager@demo.aranya   (bisa approve cuti bawahan)")
  console.log("     - Karyawan : budi@demo.aranya, siti@demo.aranya")
}

main()
  .catch((err) => {
    console.error("❌ Seed demo gagal:", err.message ?? err)
    process.exit(1)
  })
  .finally(() => process.exit(0))
