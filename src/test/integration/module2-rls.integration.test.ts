import { describe, it, expect, afterAll } from "vitest"
import { db, withTenantContext, withSuperAdminContext } from "@/lib/db"
import {
  assets,
  kpiPeriods,
  kpiScorecards,
  kpiEpics,
  kpiTasks,
  kpiProgress,
  kpiFeedback,
  kpiAppraisals,
  onboardingTasks,
} from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { createTestTenant, createTestEmployee, cleanupTenants } from "./helpers"

// Buat rantai periode→scorecard→epic→task ephemeral (bypass).
async function createTestChain(tenantId: string, employeeId: string) {
  return withSuperAdminContext(async (tx) => {
    const [p] = await tx
      .insert(kpiPeriods)
      .values({ tenantId, name: "Periode Test", type: "quarterly", startDate: new Date("2026-01-01"), endDate: new Date("2026-03-31") })
      .returning()
    const [sc] = await tx
      .insert(kpiScorecards)
      .values({ tenantId, periodId: p.id, employeeId, managerId: "mgr" })
      .returning()
    const [ep] = await tx.insert(kpiEpics).values({ tenantId, scorecardId: sc.id, name: "Epic", weight: 100 }).returning()
    const [task] = await tx
      .insert(kpiTasks)
      .values({ tenantId, epicId: ep.id, title: "Task", weight: 100, rubric: [{ score: 3, criteria: "x" }] })
      .returning()
    return { period: p, scorecard: sc, epic: ep, task }
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

  describe("kpi_scorecards", () => {
    it("baca terisolasi; tanpa context kosong; bypass lihat semua; tulis lintas-tenant ditolak", async () => {
      const { t1, t2, e1, e2 } = await twoTenants("kpisc")
      const c1 = await createTestChain(t1.id, e1.id)
      const c2 = await createTestChain(t2.id, e2.id)

      const idsT1 = (
        await withTenantContext(t1.id, (tx) => tx.select({ id: kpiScorecards.id }).from(kpiScorecards))
      ).map((r) => r.id)
      expect(idsT1).toContain(c1.scorecard.id)
      expect(idsT1).not.toContain(c2.scorecard.id)

      const noCtx = await db.select({ id: kpiScorecards.id }).from(kpiScorecards)
      expect(noCtx).toHaveLength(0)

      const bypass = await withSuperAdminContext((tx) =>
        tx.select({ id: kpiScorecards.id }).from(kpiScorecards).where(eq(kpiScorecards.id, c2.scorecard.id)),
      )
      expect(bypass).toHaveLength(1)

      await expect(
        withTenantContext(t1.id, (tx) =>
          tx.insert(kpiScorecards).values({ tenantId: t2.id, periodId: c1.period.id, employeeId: e1.id, managerId: "m" }),
        ),
      ).rejects.toThrow()
    })
  })

  describe("kpi_tasks, progress, feedback & appraisals (via task)", () => {
    it("baca terisolasi & tulis lintas-tenant ditolak", async () => {
      const { t1, t2, e1, e2 } = await twoTenants("kpitask")
      const c1 = await createTestChain(t1.id, e1.id)
      const c2 = await createTestChain(t2.id, e2.id)

      // tasks
      const taskT1 = (await withTenantContext(t1.id, (tx) => tx.select({ id: kpiTasks.id }).from(kpiTasks))).map((r) => r.id)
      expect(taskT1).toContain(c1.task.id)
      expect(taskT1).not.toContain(c2.task.id)
      expect(await db.select({ id: kpiTasks.id }).from(kpiTasks)).toHaveLength(0)

      // progres + bukti
      await withTenantContext(t1.id, (tx) =>
        tx.insert(kpiProgress).values({ tenantId: t1.id, taskId: c1.task.id, percent: 50, createdById: "u1" }),
      )
      expect(await db.select({ id: kpiProgress.id }).from(kpiProgress)).toHaveLength(0)
      await expect(
        withTenantContext(t1.id, (tx) =>
          tx.insert(kpiProgress).values({ tenantId: t2.id, taskId: c1.task.id, percent: 10, createdById: "u1" }),
        ),
      ).rejects.toThrow()

      // feedback
      await withTenantContext(t1.id, (tx) =>
        tx.insert(kpiFeedback).values({ tenantId: t1.id, taskId: c1.task.id, fromUserId: "u1", message: "ok" }),
      )
      expect(await db.select({ id: kpiFeedback.id }).from(kpiFeedback)).toHaveLength(0)

      // appraisal
      await withTenantContext(t1.id, (tx) =>
        tx.insert(kpiAppraisals).values({ tenantId: t1.id, taskId: c1.task.id, finalScore: 4 }),
      )
      expect(await db.select({ id: kpiAppraisals.id }).from(kpiAppraisals)).toHaveLength(0)
      await expect(
        withTenantContext(t1.id, (tx) =>
          tx.insert(kpiAppraisals).values({ tenantId: t2.id, taskId: c2.task.id, finalScore: 3 }),
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
