import { withSuperAdminContext } from "@/lib/db"
import { tenants, tenantModules, invitations, employees } from "@/lib/db/schema"
import { eq, and, isNull, desc, count } from "drizzle-orm"

export interface TenantDetail {
  tenant: typeof tenants.$inferSelect
  modules: { moduleCode: string; isActive: boolean }[]
  pendingInvite: {
    email: string
    expiresAt: Date
    isExpired: boolean
  } | null
  employeeCount: number
}

export async function getTenantDetail(id: string): Promise<TenantDetail | null> {
  return withSuperAdminContext(async (tx) => {
    const tenant = await tx.query.tenants.findFirst({ where: eq(tenants.id, id) })
    if (!tenant) return null

    const modules = await tx
      .select({ moduleCode: tenantModules.moduleCode, isActive: tenantModules.isActive })
      .from(tenantModules)
      .where(eq(tenantModules.tenantId, id))

    const invite = await tx.query.invitations.findFirst({
      where: and(eq(invitations.tenantId, id), isNull(invitations.acceptedAt)),
      orderBy: [desc(invitations.createdAt)],
    })

    const [empRow] = await tx
      .select({ n: count() })
      .from(employees)
      .where(eq(employees.tenantId, id))

    return {
      tenant,
      modules,
      pendingInvite: invite
        ? {
            email: invite.email,
            expiresAt: invite.expiresAt,
            isExpired: invite.expiresAt < new Date(),
          }
        : null,
      employeeCount: empRow?.n ?? 0,
    }
  })
}
