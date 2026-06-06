import { pgTable, text, timestamp, integer, unique } from "drizzle-orm/pg-core"

// PPh 21 progressive layers — managed by Super Admin Aranya
export const taxRateLayers = pgTable(
  "tax_rate_layers",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    year: integer("year").notNull(),
    layerFrom: integer("layer_from").notNull(),
    layerTo: integer("layer_to"),
    rate: text("rate").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.year, t.layerFrom)],
)

// PTKP values — managed by Super Admin Aranya
export const ptkpValues = pgTable(
  "ptkp_values",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    year: integer("year").notNull(),
    status: text("status").notNull(),
    amount: integer("amount").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.year, t.status)],
)

// BPJS rates — managed by Super Admin Aranya
export const bpjsRates = pgTable(
  "bpjs_rates",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    year: integer("year").notNull(),
    type: text("type").notNull(),
    employerRate: text("employer_rate"),
    employeeRate: text("employee_rate"),
    wageCapAmount: integer("wage_cap_amount"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.year, t.type)],
)
