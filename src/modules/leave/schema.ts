import { z } from "zod"

export const LEAVE_TYPES = [
  { value: "annual", label: "Cuti Tahunan", affectsQuota: true },
  { value: "sick", label: "Sakit", affectsQuota: false },
  { value: "permission", label: "Izin", affectsQuota: false },
  { value: "maternity", label: "Melahirkan", affectsQuota: false },
  { value: "important", label: "Keperluan Penting", affectsQuota: false },
] as const

export type LeaveTypeValue = (typeof LEAVE_TYPES)[number]["value"]

export function leaveTypeLabel(value: string): string {
  return LEAVE_TYPES.find((t) => t.value === value)?.label ?? value
}

export function affectsQuota(value: string): boolean {
  return LEAVE_TYPES.find((t) => t.value === value)?.affectsQuota ?? false
}

export const requestLeaveSchema = z
  .object({
    type: z.enum(["annual", "sick", "permission", "maternity", "important"], {
      errorMap: () => ({ message: "Jenis cuti tidak valid" }),
    }),
    startDate: z.string().min(1, "Tanggal mulai wajib diisi"),
    endDate: z.string().min(1, "Tanggal selesai wajib diisi"),
    reason: z.string().trim().optional(),
  })
  .refine((d) => new Date(d.endDate) >= new Date(d.startDate), {
    message: "Tanggal selesai tidak boleh sebelum tanggal mulai",
    path: ["endDate"],
  })

export type RequestLeaveInput = z.infer<typeof requestLeaveSchema>
