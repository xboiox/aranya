import { describe, it, expect, afterAll } from "vitest"
import { db, withTenantContext, withSuperAdminContext } from "@/lib/db"
import { assets, kpiEvaluations, onboardingTasks } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { createTestTenant, createTestEmployee, cleanupTenants } from "./helpers"

const created: string[] = []
afterAll(() => cleanupTenants(created))

// Dua tenant + satu karyawan di masing-masing, untuk dipakai per test.
async function twoTenants(label: string) {
  const t1 = await createTestTenant(`${label}1`)
  const t2 = await createTestTenant(`${label}2`)
  created.push(t1.id, t2.id)
  const e1 = await createTestEmployee(t1.id, { name: "Emp T1" })
  const e2 = await createTestEmployee(t2.id, { name: "Emp T2" })
  return { t1, t2, e1: e1.employee, e2: e2.employee }
}

describe("RLS isolasi tabel Modul 2 (DB nyata, app role)", () => {
  describe("assets", () => {
    it("baca: tenant hanya lihat asetnya sendiri; tanpa context kosong; bypass lihat semua", async () => {
      const { t1, t2 } = await twoTenants("asset")

      const [a1] = await withTenantContext(t1.id, (tx) =>
        tx.insert(assets).values({ tenantId: t1.id, name: "Laptop T1", category: "laptop" }).returning(),
      )
      const [a2] = await withTenantContext(t2.id, (tx) =>
        tx.insert(assets).values({ tenantId: t2.id, name: "Laptop T2", category: "laptop" }).returning(),
      )

      const idsT1 = (
        await withTenantContext(t1.id, (tx) => tx.select({ id: assets.id }).from(assets))
      ).map((r) => r.id)
      expect(idsT1).toContain(a1.id)
      expect(idsT1).not.toContain(a2.id)

      const noCtx = await db.select({ id: assets.id }).from(assets).where(eq(assets.id, a1.id))
      expect(noCtx).toHaveLength(0)

      const bypass = await withSuperAdminContext((tx) =>
        tx.select({ id: assets.id }).from(assets).where(eq(assets.id, a2.id)),
      )
      expect(bypass).toHaveLength(1)
    })

    it("tulis: konteks t1 tidak bisa insert aset milik t2 (WITH CHECK)", async () => {
      const { t1, t2 } = await twoTenants("assetw")
      await expect(
        withTenantContext(t1.id, (tx) =>
          tx.insert(assets).values({ tenantId: t2.id, name: "Selundup", category: "other" }),
        ),
      ).rejects.toThrow()
    })
  })

  describe("kpi_evaluations", () => {
    it("baca: tenant hanya lihat penilaiannya sendiri; tanpa context kosong; bypass lihat semua", async () => {
      const { t1, t2, e1, e2 } = await twoTenants("kpi")

      const [k1] = await withTenantContext(t1.id, (tx) =>
        tx
          .insert(kpiEvaluations)
          .values({ tenantId: t1.id, employeeId: e1.id, period: "2026-Q1", score: 80 })
          .returning(),
      )
      const [k2] = await withTenantContext(t2.id, (tx) =>
        tx
          .insert(kpiEvaluations)
          .values({ tenantId: t2.id, employeeId: e2.id, period: "2026-Q1", score: 90 })
          .returning(),
      )

      const idsT1 = (
        await withTenantContext(t1.id, (tx) => tx.select({ id: kpiEvaluations.id }).from(kpiEvaluations))
      ).map((r) => r.id)
      expect(idsT1).toContain(k1.id)
      expect(idsT1).not.toContain(k2.id)

      const noCtx = await db
        .select({ id: kpiEvaluations.id })
        .from(kpiEvaluations)
        .where(eq(kpiEvaluations.id, k1.id))
      expect(noCtx).toHaveLength(0)

      const bypass = await withSuperAdminContext((tx) =>
        tx.select({ id: kpiEvaluations.id }).from(kpiEvaluations).where(eq(kpiEvaluations.id, k2.id)),
      )
      expect(bypass).toHaveLength(1)
    })

    it("tulis: konteks t1 tidak bisa insert penilaian milik t2 (WITH CHECK)", async () => {
      const { t1, t2, e1 } = await twoTenants("kpiw")
      // employeeId valid milik t1 → penolakan murni dari RLS WITH CHECK pada tenant_id
      await expect(
        withTenantContext(t1.id, (tx) =>
          tx
            .insert(kpiEvaluations)
            .values({ tenantId: t2.id, employeeId: e1.id, period: "2026-Q2", score: 70 }),
        ),
      ).rejects.toThrow()
    })
  })

  describe("onboarding_tasks", () => {
    it("baca: tenant hanya lihat checklist-nya sendiri; tanpa context kosong; bypass lihat semua", async () => {
      const { t1, t2, e1, e2 } = await twoTenants("onb")

      const [o1] = await withTenantContext(t1.id, (tx) =>
        tx
          .insert(onboardingTasks)
          .values({ tenantId: t1.id, employeeId: e1.id, type: "onboarding", task: "Tugas T1" })
          .returning(),
      )
      const [o2] = await withTenantContext(t2.id, (tx) =>
        tx
          .insert(onboardingTasks)
          .values({ tenantId: t2.id, employeeId: e2.id, type: "onboarding", task: "Tugas T2" })
          .returning(),
      )

      const idsT1 = (
        await withTenantContext(t1.id, (tx) => tx.select({ id: onboardingTasks.id }).from(onboardingTasks))
      ).map((r) => r.id)
      expect(idsT1).toContain(o1.id)
      expect(idsT1).not.toContain(o2.id)

      const noCtx = await db
        .select({ id: onboardingTasks.id })
        .from(onboardingTasks)
        .where(eq(onboardingTasks.id, o1.id))
      expect(noCtx).toHaveLength(0)

      const bypass = await withSuperAdminContext((tx) =>
        tx.select({ id: onboardingTasks.id }).from(onboardingTasks).where(eq(onboardingTasks.id, o2.id)),
      )
      expect(bypass).toHaveLength(1)
    })

    it("tulis: konteks t1 tidak bisa insert checklist milik t2 (WITH CHECK)", async () => {
      const { t1, t2, e1 } = await twoTenants("onbw")
      await expect(
        withTenantContext(t1.id, (tx) =>
          tx
            .insert(onboardingTasks)
            .values({ tenantId: t2.id, employeeId: e1.id, type: "offboarding", task: "Selundup" }),
        ),
      ).rejects.toThrow()
    })
  })
})
