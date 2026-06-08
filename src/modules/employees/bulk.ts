import { z } from "zod"
import { parseCsv, buildCsv } from "@/lib/csv"

export const EMPLOYEE_CSV_HEADERS = [
  "email",
  "name",
  "role",
  "position",
  "department",
  "contractType",
  "joinDate",
  "reportsToEmail",
] as const

export type EmployeeCsvHeader = (typeof EMPLOYEE_CSV_HEADERS)[number]

// Template contoh untuk diunduh HR.
export const EMPLOYEE_CSV_TEMPLATE = buildCsv([...EMPLOYEE_CSV_HEADERS], [
  ["budi@contoh.com", "Budi Santoso", "employee", "Staff Finance", "Finance", "PKWT", "2026-01-15", ""],
  ["sari@contoh.com", "Sari Dewi", "manager", "Finance Manager", "Finance", "PKWTT", "2025-03-01", ""],
  ["andi@contoh.com", "Andi Pratama", "employee", "Junior Analyst", "Finance", "probation", "2026-02-01", "sari@contoh.com"],
])

const optional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" || v === undefined ? undefined : v))

const bulkRowSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email tidak valid"),
  name: z.string().trim().min(2, "Nama minimal 2 karakter"),
  role: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.toLowerCase() : "employee"))
    .pipe(
      z.enum(["employee", "manager"], {
        errorMap: () => ({ message: "Role harus employee atau manager" }),
      }),
    ),
  position: optional,
  department: optional,
  contractType: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .pipe(
      z
        .enum(["probation", "PKWT", "PKWTT", "kontrak"], {
          errorMap: () => ({ message: "contractType tidak valid (probation/PKWT/PKWTT/kontrak)" }),
        })
        .optional(),
    ),
  joinDate: optional.pipe(
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "joinDate harus format YYYY-MM-DD")
      .optional(),
  ),
  reportsToEmail: optional.pipe(z.string().email("reportsToEmail tidak valid").toLowerCase().optional()),
})

export type BulkEmployeeRow = z.infer<typeof bulkRowSchema>

export interface BulkParseError {
  line: number // nomor baris pada file (1 = header)
  message: string
}

export interface BulkParseResult {
  valid: BulkEmployeeRow[]
  errors: BulkParseError[]
  headerError?: string
}

/**
 * Mem-parse & memvalidasi CSV karyawan. Header boleh berbeda urutan; minimal
 * harus memuat kolom email & name. Mengembalikan baris valid + error per baris.
 */
export function parseEmployeeCsv(text: string): BulkParseResult {
  const rows = parseCsv(text)
  if (rows.length === 0) {
    return { valid: [], errors: [], headerError: "File kosong" }
  }

  const header = rows[0].map((h) => h.trim().toLowerCase())
  const index: Partial<Record<EmployeeCsvHeader, number>> = {}
  for (const key of EMPLOYEE_CSV_HEADERS) {
    const i = header.indexOf(key.toLowerCase())
    if (i !== -1) index[key] = i
  }
  if (index.email === undefined || index.name === undefined) {
    return {
      valid: [],
      errors: [],
      headerError: `Header wajib memuat kolom: ${EMPLOYEE_CSV_HEADERS.join(", ")}`,
    }
  }

  const valid: BulkEmployeeRow[] = []
  const errors: BulkParseError[] = []
  const seenEmails = new Set<string>()

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]
    const get = (key: EmployeeCsvHeader): string | undefined => {
      const i = index[key]
      return i === undefined ? undefined : cells[i]
    }

    const parsed = bulkRowSchema.safeParse({
      email: get("email") ?? "",
      name: get("name") ?? "",
      role: get("role"),
      position: get("position"),
      department: get("department"),
      contractType: get("contractType"),
      joinDate: get("joinDate"),
      reportsToEmail: get("reportsToEmail"),
    })

    if (!parsed.success) {
      errors.push({ line: r + 1, message: parsed.error.errors[0].message })
      continue
    }
    if (seenEmails.has(parsed.data.email)) {
      errors.push({ line: r + 1, message: `Email duplikat dalam file: ${parsed.data.email}` })
      continue
    }
    seenEmails.add(parsed.data.email)
    valid.push(parsed.data)
  }

  return { valid, errors }
}
