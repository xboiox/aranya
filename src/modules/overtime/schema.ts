import { z } from "zod"

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/

export const requestOvertimeSchema = z.object({
  date: z.string().min(1, "Tanggal wajib diisi"),
  startTime: z.string().regex(timeRegex, "Jam mulai harus format HH:MM"),
  endTime: z.string().regex(timeRegex, "Jam selesai harus format HH:MM"),
  reason: z.string().trim().optional(),
})

export type RequestOvertimeInput = z.infer<typeof requestOvertimeSchema>

export const OVERTIME_STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
  cancelled: "Dibatalkan",
}

