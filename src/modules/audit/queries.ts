import { withTenantContext, withSuperAdminContext } from "@/lib/db"
import { auditLogs, users, tenants } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"

export interface AuditRow {
  id: string
  createdAt: Date
  actorName: string | null
  actorEmail: string | null
  action: string
  entityType: string | null
  entityId: string | null
  ipAddress: string | null
  tenantName: string | null
}

const PAGE_SIZE = 50

// Audit log tenant (untuk HR Admin)
export async function listTenantAuditLogs(
  tenantId: string,
  page = 0,
): Promise<{ rows: AuditRow[]; hasNext: boolean }> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx
      .select({
        id: auditLogs.id,
        createdAt: auditLogs.createdAt,
        actorName: users.name,
        actorEmail: users.email,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        ipAddress: auditLogs.ipAddress,
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.userId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(PAGE_SIZE + 1)
      .offset(page * PAGE_SIZE)
    return paginate(rows.map((r) => ({ ...r, tenantName: null })))
  })
}

// Semua audit log lintas tenant (untuk Super Admin)
export async function listAllAuditLogs(
  page = 0,
): Promise<{ rows: AuditRow[]; hasNext: boolean }> {
  return withSuperAdminContext(async (tx) => {
    const actor = alias(users, "actor")
    const rows = await tx
      .select({
        id: auditLogs.id,
        createdAt: auditLogs.createdAt,
        actorName: actor.name,
        actorEmail: actor.email,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        ipAddress: auditLogs.ipAddress,
        tenantName: tenants.name,
      })
      .from(auditLogs)
      .leftJoin(actor, eq(actor.id, auditLogs.userId))
      .leftJoin(tenants, eq(tenants.id, auditLogs.tenantId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(PAGE_SIZE + 1)
      .offset(page * PAGE_SIZE)
    return paginate(rows)
  })
}

function paginate(rows: AuditRow[]): { rows: AuditRow[]; hasNext: boolean } {
  const hasNext = rows.length > PAGE_SIZE
  return { rows: hasNext ? rows.slice(0, PAGE_SIZE) : rows, hasNext }
}
