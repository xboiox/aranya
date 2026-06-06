import {
  pgTable,
  text,
  timestamp,
  date,
  boolean,
  integer,
  doublePrecision,
  unique,
} from "drizzle-orm/pg-core"
import { tenants } from "./tenants"
import { employees } from "./employees"

// Titik geofencing per tenant (bisa beberapa lokasi kantor)
export const geofenceLocations = pgTable("geofence_locations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  radiusMeters: integer("radius_meters").notNull().default(100),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
})

// Satu baris per karyawan per tanggal (check-in + check-out)
export const attendance = pgTable(
  "attendance",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    date: date("date", { mode: "date" }).notNull(),

    checkInAt: timestamp("check_in_at", { mode: "date" }),
    checkInLat: doublePrecision("check_in_lat"),
    checkInLng: doublePrecision("check_in_lng"),
    checkInAccuracy: doublePrecision("check_in_accuracy"),
    checkInWfh: boolean("check_in_wfh").default(false).notNull(),
    checkInWithinGeofence: boolean("check_in_within_geofence"),

    checkOutAt: timestamp("check_out_at", { mode: "date" }),
    checkOutLat: doublePrecision("check_out_lat"),
    checkOutLng: doublePrecision("check_out_lng"),
    checkOutAccuracy: doublePrecision("check_out_accuracy"),
    checkOutWfh: boolean("check_out_wfh").default(false).notNull(),
    checkOutWithinGeofence: boolean("check_out_within_geofence"),

    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.employeeId, t.date)],
)

// Key tenant_config untuk toggle geofencing
export const GEOFENCING_ENABLED_KEY = "geofencing_enabled"
