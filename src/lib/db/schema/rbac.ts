import {
  pgTable,
  text,
  timestamp,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core"
import { users } from "./auth"
import { tenants } from "./tenants"

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  HR_ADMIN: "hr_admin",
  MANAGER: "manager",
  EMPLOYEE: "employee",
} as const

export type RoleName = (typeof ROLES)[keyof typeof ROLES]

export const roles = pgTable("roles", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").references(() => tenants.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
})

export const userRoles = pgTable(
  "user_roles",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    tenantId: text("tenant_id").references(() => tenants.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.userId, t.roleId, t.tenantId)],
)

export const permissions = pgTable("permissions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: text("code").unique().notNull(),
  description: text("description"),
})

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: text("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })],
)
