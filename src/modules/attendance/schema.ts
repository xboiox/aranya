import { z } from "zod"

export const coordsSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  isWfh: z.boolean().optional().default(false),
})

export type CoordsInput = z.infer<typeof coordsSchema>

export const geofenceLocationSchema = z.object({
  name: z.string().trim().min(2, "Nama lokasi minimal 2 karakter"),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusMeters: z.coerce
    .number()
    .int()
    .min(10, "Radius minimal 10 meter")
    .max(10000, "Radius maksimal 10.000 meter"),
})

export type GeofenceLocationInput = z.infer<typeof geofenceLocationSchema>
