import { describe, it, expect, afterAll } from "vitest"
import { db, withTenantContext, withSuperAdminContext } from "@/lib/db"
import {
  assets,
  kpiPeriods,
  kpis,
  kpiProgress,
  kpiFeedback,
  kpiAppraisals,
  onboardingTasks,
} from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { createTestTenant, createTestEmployee, cleanupTenants } from "./helpers"

// Buat periode KPI ephemeral (bypass) untuk dirujuk oleh kpis.
async function createTestPeriod(tenantId: string) {
  return withSuperAdminContext(async (tx) => {
    const [p] = await tx
      .insert(kpiPeriods)
      .values({
        tenantId,
        name: "Periode Test",
        type: "quarterly",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-03-31"),
      })
      .returning()
    return p
  })
}

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

  describe("kpis", () => {
    it("baca: tenant hanya lihat KPI-nya sendiri; tanpa context kosong; bypass lihat semua", async () => {
      const { t1, t2, e1, e2 } = await twoTenants("kpi")
      const p1 = await createTestPeriod(t1.id)
      const p2 = await createTestPeriod(t2.id)

      const [k1] = await withTenantContext(t1.id, (tx) =>
        tx
          .insert(kpis)
          .values({ tenantId: t1.id, periodId: p1.id, employeeId: e1.id, managerId: "m1", title: "KPI T1", weight: 100 })
          .returning(),
      )
      const [k2] = await withTenantContext(t2.id, (tx) =>
        tx
          .insert(kpis)
          .values({ tenantId: t2.id, periodId: p2.id, employeeId: e2.id, managerId: "m2", title: "KPI T2", weight: 100 })
          .returning(),
      )

      const idsT1 = (
        await withTenantContext(t1.id, (tx) => tx.select({ id: kpis.id }).from(kpis))
      ).map((r) => r.id)
      expect(idsT1).toContain(k1.id)
      expect(idsT1).not.toContain(k2.id)

      const noCtx = await db.select({ id: kpis.id }).from(kpis).where(eq(kpis.id, k1.id))
      expect(noCtx).toHaveLength(0)

      const bypass = await withSuperAdminContext((tx) =>
        tx.select({ id: kpis.id }).from(kpis).where(eq(kpis.id, k2.id)),
      )
      expect(bypass).toHaveLength(1)
    })

    it("tulis: konteks t1 tidak bisa insert KPI milik t2 (WITH CHECK)", async () => {
      const { t1, t2, e1 } = await twoTenants("kpiw")
      const p1 = await createTestPeriod(t1.id)
      // employeeId & periodId valid milik t1 → penolakan murni dari RLS WITH CHECK pada tenant_id
      await expect(
        withTenantContext(t1.id, (tx) =>
          tx
            .insert(kpis)
            .values({ tenantId: t2.id, periodId: p1.id, employeeId: e1.id, managerId: "m1", title: "Selundup", weight: 100 }),
        ),
      ).rejects.toThrow()
    })
  })

  describe("kpi_progress & kpi_feedback", () => {
    it("baca terisolasi & tulis lintas-tenant ditolak", async () => {
      const { t1, t2, e1, e2 } = await twoTenants("kpibc")
      const p1 = await createTestPeriod(t1.id)
      const p2 = await createTestPeriod(t2.id)
      const [k1] = await withTenantContext(t1.id, (tx) =>
        tx.insert(kpis).values({ tenantId: t1.id, periodId: p1.id, employeeId: e1.id, managerId: "m1", title: "K1", weight: 100 }).returning(),
      )
      const [k2] = await withTenantContext(t2.id, (tx) =>
        tx.insert(kpis).values({ tenantId: t2.id, periodId: p2.id, employeeId: e2.id, managerId: "m2", title: "K2", weight: 100 }).returning(),
      )

      // progres
      await withTenantContext(t1.id, (tx) =>
        tx.insert(kpiProgress).values({ tenantId: t1.id, kpiId: k1.id, percent: 50, createdById: "u1" }),
      )
      await withTenantContext(t2.id, (tx) =>
        tx.insert(kpiProgress).values({ tenantId: t2.id, kpiId: k2.id, percent: 70, createdById: "u2" }),
      )
      const progT1 = await withTenantContext(t1.id, (tx) => tx.select({ id: kpiProgress.id, kpiId: kpiProgress.kpiId }).from(kpiProgress))
      expect(progT1.every((r) => r.kpiId === k1.id)).toBe(true)
      const progNoCtx = await db.select({ id: kpiProgress.id }).from(kpiProgress)
      expect(progNoCtx).toHaveLength(0)
      await expect(
        withTenantContext(t1.id, (tx) =>
          tx.insert(kpiProgress).values({ tenantId: t2.id, kpiId: k1.id, percent: 10, createdById: "u1" }),
        ),
      ).rejects.toThrow()

      // feedback
      await withTenantContext(t1.id, (tx) =>
        tx.insert(kpiFeedback).values({ tenantId: t1.id, kpiId: k1.id, fromUserId: "u1", message: "ok" }),
      )
      const fbNoCtx = await db.select({ id: kpiFeedback.id }).from(kpiFeedback)
      expect(fbNoCtx).toHaveLength(0)
      await expect(
        withTenantContext(t1.id, (tx) =>
          tx.insert(kpiFeedback).values({ tenantId: t2.id, kpiId: k1.id, fromUserId: "u1", message: "x" }),
        ),
      ).rejects.toThrow()

      // appraisal
      await withTenantContext(t1.id, (tx) =>
        tx.insert(kpiAppraisals).values({ tenantId: t1.id, kpiId: k1.id, finalScore: 4 }),
      )
      const apprNoCtx = await db.select({ id: kpiAppraisals.id }).from(kpiAppraisals)
      expect(apprNoCtx).toHaveLength(0)
      await expect(
        withTenantContext(t1.id, (tx) =>
          tx.insert(kpiAppraisals).values({ tenantId: t2.id, kpiId: k2.id, finalScore: 3 }),
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
