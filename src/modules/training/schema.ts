import { z } from "zod"

export const TRAINING_TYPE_OPTIONS = [
  { value: "training", label: "Pelatihan" },
  { value: "certification", label: "Sertifikasi" },
] as const

export const TRAINING_STATUS_LABEL: Record<string, string> = {
  planned: "Direncanakan",
  ongoing: "Berlangsung",
  completed: "Selesai",
}

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v))

export const trainingSchema = z.object({
  employeeId: z.string().min(1, "Karyawan wajib dipilih"),
  title: z.string().trim().min(2, "Judul minimal 2 karakter"),
  type: z.enum(["training", "certification"]),
  provider: optionalString,
  startDate: optionalString,
  completionDate: optionalString,
  expiryDate: optionalString,
  status: z.enum(["planned", "ongoing", "completed"]),
  notes: optionalString,
})

export type TrainingInput = z.infer<typeof trainingSchema>

export type CertStatus = "expired" | "expiring" | "valid" | null

// Status masa berlaku sertifikat (expiring jika <= 30 hari)
export function certStatus(expiryDate: Date | null): CertStatus {
  if (!expiryDate) return null
  const now = new Date()
  now.setUTCHours(0, 0, 0, 0)
  const exp = new Date(expiryDate)
  const days = (exp.getTime() - now.getTime()) / 86_400_000
  if (days < 0) return "expired"
  if (days <= 30) return "expiring"
  return "valid"
}
