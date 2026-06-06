import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core"
import { users } from "./auth"
import { tenants } from "./tenants"

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  data: text("data"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
})
