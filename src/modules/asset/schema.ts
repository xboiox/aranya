import { z } from "zod"

export const ASSET_CATEGORY_OPTIONS = [
  { value: "laptop", label: "Laptop" },
  { value: "phone", label: "HP" },
  { value: "vehicle", label: "Kendaraan" },
  { value: "access_card", label: "Kartu Akses" },
  { value: "other", label: "Lainnya" },
] as const

export function assetCategoryLabel(v: string): string {
  return ASSET_CATEGORY_OPTIONS.find((c) => c.value === v)?.label ?? v
}

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v))

export const createAssetSchema = z.object({
  name: z.string().trim().min(2, "Nama aset minimal 2 karakter"),
  category: z.enum(["laptop", "phone", "vehicle", "access_card", "other"]),
  serialNumber: optionalString,
  notes: optionalString,
})

export type CreateAssetInput = z.infer<typeof createAssetSchema>
