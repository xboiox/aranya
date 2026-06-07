import { z } from "zod"

export const createTenantSchema = z.object({
  name: z.string().min(2, "Nama perusahaan minimal 2 karakter"),
  slug: z
    .string()
    .min(2, "Slug minimal 2 karakter")
    .regex(/^[a-z0-9-]+$/, "Slug hanya boleh huruf kecil, angka, dan tanda hubung"),
  hrAdminEmail: z.string().email("Email HR Admin tidak valid"),
  // checkbox: null bila tidak dicentang (tidak terkirim) → nullish menerima string|null|undefined
  module2: z.string().nullish(),
  module3: z.string().nullish(),
})

export type CreateTenantInput = z.infer<typeof createTenantSchema>
