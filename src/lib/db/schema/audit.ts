import { pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { users } from "./auth"
import { tenants } from "./tenants"

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").references(() => tenants.id),
  userId: text("user_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  oldValues: text("old_values"),
  newValues: text("new_values"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
})
