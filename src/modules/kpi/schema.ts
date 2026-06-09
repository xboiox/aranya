import { z } from "zod"

export const PERIOD_TYPE_OPTIONS = [
  { value: "quarterly", label: "Kuartalan" },
  { value: "annual", label: "Tahunan" },
] as const

export type PeriodStatus = "planning" | "active" | "appraisal" | "locked"

export const PERIOD_STATUS_LABEL: Record<PeriodStatus, string> = {
  planning: "Perencanaan",
  active: "Berjalan",
  appraisal: "Penilaian",
  locked: "Terkunci",
}

export const PERIOD_STATUS_STYLE: Record<PeriodStatus, string> = {
  planning: "bg-amber-100 text-amber-800",
  active: "bg-blue-100 text-blue-800",
  appraisal: "bg-purple-100 text-purple-800",
  locked: "bg-muted text-muted-foreground",
}

export type KpiStatus = "draft" | "proposed" | "agreed" | "revision_requested"

export const KPI_STATUS_LABEL: Record<KpiStatus, string> = {
  draft: "Draf",
  proposed: "Menunggu persetujuan",
  agreed: "Disetujui",
  revision_requested: "Minta revisi",
}

export const KPI_STATUS_STYLE: Record<KpiStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  proposed: "bg-amber-100 text-amber-800",
  agreed: "bg-emerald-100 text-emerald-800",
  revision_requested: "bg-red-100 text-red-800",
}

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal harus format YYYY-MM-DD")

export const periodCreateSchema = z
  .object({
    name: z.string().trim().min(2, "Nama periode minimal 2 karakter").max(100),
    type: z.enum(["quarterly", "annual"], {
      errorMap: () => ({ message: "Tipe periode tidak valid" }),
    }),
    startDate: dateStr,
    endDate: dateStr,
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: "Tanggal selesai tidak boleh sebelum tanggal mulai",
    path: ["endDate"],
  })

export const objectiveCreateSchema = z.object({
  title: z.string().trim().min(2, "Judul minimal 2 karakter").max(200),
  description: z.string().trim().max(1000).optional().nullish(),
})

const weightField = z.coerce
  .number({ invalid_type_error: "Bobot harus angka" })
  .int("Bobot harus bilangan bulat")
  .min(1, "Bobot minimal 1%")
  .max(100, "Bobot maksimal 100%")

export const kpiCreateSchema = z.object({
  employeeId: z.string().min(1, "Karyawan wajib dipilih"),
  title: z.string().trim().min(2, "Judul minimal 2 karakter").max(200),
  description: z.string().trim().max(1000).optional().nullish(),
  weight: weightField,
  target: z.string().trim().max(300).optional().nullish(),
})

export const kpiUpdateSchema = z.object({
  title: z.string().trim().min(2, "Judul minimal 2 karakter").max(200),
  description: z.string().trim().max(1000).optional().nullish(),
  weight: weightField,
  target: z.string().trim().max(300).optional().nullish(),
})
