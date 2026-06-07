import { withTenantContext } from "@/lib/db"
import { tenantModules } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

export const MODULE_LABELS: Record<string, string> = {
  MODULE_1: "Core HR & Employee Self-Service",
  MODULE_2: "Payroll & Performance Management",
  MODULE_3: "HR Operations & Development",
}

export async function getActiveModules(tenantId: string): Promise<string[]> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({ code: tenantModules.moduleCode })
      .from(tenantModules)
      .where(and(eq(tenantModules.tenantId, tenantId), eq(tenantModules.isActive, true)))
    return rows.map((r) => r.code)
  })
}

export async function isModuleActive(
  tenantId: string,
  moduleCode: string,
): Promise<boolean> {
  return withTenantContext(tenantId, async (tx) => {
    const row = await tx.query.tenantModules.findFirst({
      where: and(
        eq(tenantModules.tenantId, tenantId),
        eq(tenantModules.moduleCode, moduleCode),
        eq(tenantModules.isActive, true),
      ),
    })
    return Boolean(row)
  })
}
