import {
  pgTable,
  text,
  timestamp,
  boolean,
  unique,
  date,
} from "drizzle-orm/pg-core"

export const tenants = pgTable("tenants", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  logoUrl: text("logo_url"),
  isActive: boolean("is_active").default(true).notNull(),
  subscriptionStatus: text("subscription_status").default("trial").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
})

export const MODULE_CODES = {
  MODULE_1: "MODULE_1",
  MODULE_2: "MODULE_2",
  MODULE_3: "MODULE_3",
} as const

export const tenantModules = pgTable(
  "tenant_modules",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    moduleCode: text("module_code").notNull(),
    isActive: boolean("is_active").default(false).notNull(),
    activatedAt: timestamp("activated_at", { mode: "date" }),
  },
  (t) => [unique().on(t.tenantId, t.moduleCode)],
)

export const tenantConfig = pgTable(
  "tenant_config",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: text("value").notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.tenantId, t.key)],
)

export const holidays = pgTable("holidays", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id").references(() => tenants.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  date: date("date", { mode: "date" }).notNull(),
  isRecurring: boolean("is_recurring").default(false).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
})
