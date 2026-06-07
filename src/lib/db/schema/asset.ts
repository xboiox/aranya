import { pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { tenants } from "./tenants"
import { employees } from "./employees"

export const ASSET_CATEGORY = {
  LAPTOP: "laptop",
  PHONE: "phone",
  VEHICLE: "vehicle",
  ACCESS_CARD: "access_card",
  OTHER: "other",
} as const

export const assets = pgTable("assets", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  serialNumber: text("serial_number"),
  // Pemegang saat ini (null = tersedia). set null jika karyawan dihapus.
  assignedToId: text("assigned_to_id").references(() => employees.id, {
    onDelete: "set null",
  }),
  assignedAt: timestamp("assigned_at", { mode: "date" }),
  returnedAt: timestamp("returned_at", { mode: "date" }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
})
