import { z } from "zod"
import type { RubricLevel } from "@/lib/db/schema"

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

export type ScorecardStatus = "draft" | "proposed" | "agreed" | "revision_requested"

export const SCORECARD_STATUS_LABEL: Record<ScorecardStatus, string> = {
  draft: "Draf",
  proposed: "Menunggu persetujuan",
  agreed: "Disetujui",
  revision_requested: "Minta revisi",
}

export const SCORECARD_STATUS_STYLE: Record<ScorecardStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  proposed: "bg-amber-100 text-amber-800",
  agreed: "bg-emerald-100 text-emerald-800",
  revision_requested: "bg-red-100 text-red-800",
}

export const SCORE_LABEL: Record<number, string> = {
  1: "Sangat kurang",
  2: "Kurang",
  3: "Cukup (target)",
  4: "Baik",
  5: "Sangat baik",
}

export const KPI_RED_THRESHOLD = 30
export const RUBRIC_SIZE = 5
export const RUBRIC_TARGET_SCORE = 3

// Rubrik kosong (5 level) untuk scaffold form task baru.
export function emptyRubric(): RubricLevel[] {
  return [1, 2, 3, 4, 5].map((score) => ({ score, criteria: "" }))
}

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal harus format YYYY-MM-DD")
const weightField = z.coerce
  .number({ invalid_type_error: "Bobot harus angka" })
  .int("Bobot harus bilangan bulat")
  .min(1, "Bobot minimal 1%")
  .max(100, "Bobot maksimal 100%")
const score15 = z.coerce
  .number({ invalid_type_error: "Skor harus angka" })
  .int("Skor harus bilangan bulat")
  .min(1, "Skor minimal 1")
  .max(5, "Skor maksimal 5")

export const periodCreateSchema = z
  .object({
    name: z.string().trim().min(2, "Nama periode minimal 2 karakter").max(100),
    type: z.enum(["quarterly", "annual"], { errorMap: () => ({ message: "Tipe periode tidak valid" }) }),
    startDate: dateStr,
    endDate: dateStr,
  })
  .refine((d) => d.endDate >= d.startDate, { message: "Tanggal selesai tidak boleh sebelum mulai", path: ["endDate"] })

export const objectiveCreateSchema = z.object({
  title: z.string().trim().min(2, "Judul minimal 2 karakter").max(200),
  description: z.string().trim().max(1000).optional().nullish(),
})

export const epicSchema = z.object({
  name: z.string().trim().min(2, "Nama Epic minimal 2 karakter").max(150),
  weight: weightField,
})

export const taskSchema = z.object({
  title: z.string().trim().min(2, "Judul Task minimal 2 karakter").max(200),
  weight: weightField,
  targetNote: z.string().trim().max(300).optional().nullish(),
})

// Rubrik: 5 baris kriteria (boleh sebagian kosong selain target/skor 3 disarankan terisi).
export function parseRubric(formData: FormData): RubricLevel[] {
  return [1, 2, 3, 4, 5].map((score) => ({
    score,
    criteria: String(formData.get(`rubric_${score}`) ?? "").trim(),
  }))
}

export const subtaskSchema = z.object({
  title: z.string().trim().min(1, "Sub-task tidak boleh kosong").max(200),
})

export const progressSchema = z.object({
  percent: z.coerce.number({ invalid_type_error: "Progres harus angka" }).int().min(0, "Min 0%").max(100, "Maks 100%"),
  note: z.string().trim().max(1000).optional().nullish(),
})

export const feedbackSchema = z.object({
  message: z.string().trim().min(1, "Pesan tidak boleh kosong").max(1000),
})

export const realizationSchema = z.object({
  realization: z.string().trim().max(1000).optional().nullish(),
  selfScore: score15,
})

export const managerScoreSchema = z.object({
  managerScore: score15,
  managerNote: z.string().trim().max(1000).optional().nullish(),
  notesOnAchievement: z.string().trim().max(1000).optional().nullish(),
})

export const calibrateSchema = z.object({ finalScore: score15 })
