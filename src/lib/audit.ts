import { headers } from "next/headers"
import { withSuperAdminContext } from "@/lib/db"
import { auditLogs } from "@/lib/db/schema"

interface AuditInput {
  tenantId?: string | null
  userId?: string | null
  action: string
  entityType?: string
  entityId?: string
  oldValues?: unknown
  newValues?: unknown
}

/**
 * Catat audit log. Insert lewat bypass context (operasi sistem).
 * Kegagalan audit TIDAK boleh menggagalkan operasi utama — selalu di-catch.
 */
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    let ipAddress: string | null = null
    let userAgent: string | null = null

    try {
      const h = await headers()
      ipAddress =
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        h.get("x-real-ip") ??
        null
      userAgent = h.get("user-agent") ?? null
    } catch {
      // headers() tidak tersedia di luar request scope — abaikan
    }

    await withSuperAdminContext(async (tx) => {
      await tx.insert(auditLogs).values({
        tenantId: input.tenantId ?? null,
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        oldValues:
          input.oldValues != null ? JSON.stringify(input.oldValues) : null,
        newValues:
          input.newValues != null ? JSON.stringify(input.newValues) : null,
        ipAddress,
        userAgent,
      })
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[audit] gagal mencatat audit log:", err)
  }
}
