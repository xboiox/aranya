import { z } from "zod"

export const CONTRACT_TYPE_OPTIONS = [
  { value: "probation", label: "Probation" },
  { value: "PKWT", label: "PKWT (Kontrak)" },
  { value: "PKWTT", label: "PKWTT (Tetap)" },
  { value: "kontrak", label: "Kontrak Lainnya" },
] as const

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v))

export const employeeCreateSchema = z.object({
  email: z.string().email("Email tidak valid"),
  name: z.string().trim().min(2, "Nama minimal 2 karakter"),
  role: z.enum(["employee", "manager"], {
    errorMap: () => ({ message: "Role harus employee atau manager" }),
  }),
  position: optionalString,
  department: optionalString,
  contractType: z
    .enum(["probation", "PKWT", "PKWTT", "kontrak"])
    .optional()
    .or(z.literal("").transform(() => undefined)),
  joinDate: optionalString,
  reportsToId: optionalString,
})

export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>

export const employeeUpdateSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter"),
  position: optionalString,
  department: optionalString,
  contractType: z
    .enum(["probation", "PKWT", "PKWTT", "kontrak"])
    .optional()
    .or(z.literal("").transform(() => undefined)),
  joinDate: optionalString,
  reportsToId: optionalString,
  defaultShiftId: optionalString,
  nik: optionalString,
  npwp: optionalString,
  phone: optionalString,
  address: optionalString,
  bankName: optionalString,
  bankAccountNumber: optionalString,
  bankAccountName: optionalString,
  bpjsKesehatan: optionalString,
  bpjsKetenagakerjaan: optionalString,
  isActive: z.boolean().optional(),
})

export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>
