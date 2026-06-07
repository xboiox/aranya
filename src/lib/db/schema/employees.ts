import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  date,
  type AnyPgColumn,
} from "drizzle-orm/pg-core"
import { users } from "./auth"
import { tenants } from "./tenants"
import { shifts } from "./shift"

export const CONTRACT_TYPES = {
  PKWT: "PKWT",
  PKWTT: "PKWTT",
  PROBATION: "probation",
  KONTRAK: "kontrak",
} as const

export const PTKP_STATUS = {
  TK_0: "TK/0",
  TK_1: "TK/1",
  TK_2: "TK/2",
  TK_3: "TK/3",
  K_0: "K/0",
  K_1: "K/1",
  K_2: "K/2",
  K_3: "K/3",
} as const

export const employees = pgTable("employees", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  reportsToId: text("reports_to_id").references(
    (): AnyPgColumn => employees.id,
  ),

  // Personal data
  nik: text("nik"),
  npwp: text("npwp"),
  phone: text("phone"),
  birthDate: date("birth_date", { mode: "date" }),
  address: text("address"),
  gender: text("gender"),

  // Employment data
  employeeCode: text("employee_code"),
  position: text("position"),
  department: text("department"),
  joinDate: date("join_date", { mode: "date" }),
  contractType: text("contract_type"),
  contractEndDate: date("contract_end_date", { mode: "date" }),
  defaultShiftId: text("default_shift_id").references(() => shifts.id, {
    onDelete: "set null",
  }),

  // Bank & BPJS
  bankName: text("bank_name"),
  bankAccountNumber: text("bank_account_number"),
  bankAccountName: text("bank_account_name"),
  bpjsKesehatan: text("bpjs_kesehatan"),
  bpjsKetenagakerjaan: text("bpjs_ketenagakerjaan"),

  // Payroll (Modul 2)
  baseSalary: integer("base_salary"),
  ptkpStatus: text("ptkp_status"),

  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
})
