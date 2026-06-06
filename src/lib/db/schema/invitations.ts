import { pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { users } from "./auth"
import { tenants } from "./tenants"
import { roles } from "./rbac"

export const invitations = pgTable("invitations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").references(() => tenants.id, {
    onDelete: "cascade",
  }),
  email: text("email").notNull(),
  roleId: text("role_id")
    .notNull()
    .references(() => roles.id),
  invitedById: text("invited_by_id")
    .notNull()
    .references(() => users.id),
  token: text("token").unique().notNull(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  acceptedAt: timestamp("accepted_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
})
