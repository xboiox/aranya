import { isWithinAnyGeofence, type GeofencePoint } from "@/lib/geo"

// Ambang akurasi GPS maksimum (meter) saat geofencing diberlakukan.
// Pembacaan dengan akurasi lebih buruk dari ini tidak bisa diandalkan untuk validasi.
export const MAX_ACCURACY_METERS = 100

export interface AttendanceContext {
  isWfh: boolean
  latitude: number
  longitude: number
  accuracy: number | null
  geofencingEnabled: boolean
  locations: GeofencePoint[]
}

export interface AttendanceDecision {
  within: boolean | null // null = tidak divalidasi (WFH / geofencing off)
  blocked: boolean
  reason?: string
}

/**
 * Keputusan apakah check-in/out diizinkan, berdasarkan WFH, status geofencing,
 * akurasi GPS, dan posisi terhadap titik kantor. Fungsi murni — mudah ditest.
 */
export function evaluateAttendance(ctx: AttendanceContext): AttendanceDecision {
  // WFH → tidak ada validasi lokasi
  if (ctx.isWfh) return { within: null, blocked: false }

  // Geofencing nonaktif atau tidak ada titik → catat lokasi saja
  if (!ctx.geofencingEnabled || ctx.locations.length === 0) {
    return { within: null, blocked: false }
  }

  // Geofencing aktif: akurasi harus memadai
  if (ctx.accuracy != null && ctx.accuracy > MAX_ACCURACY_METERS) {
    return {
      within: null,
      blocked: true,
      reason: `Akurasi GPS terlalu rendah (±${Math.round(ctx.accuracy)} m). Pastikan GPS aktif dan coba di luar ruangan.`,
    }
  }

  const within = isWithinAnyGeofence(ctx.latitude, ctx.longitude, ctx.locations)
  if (!within) {
    return {
      within: false,
      blocked: true,
      reason: "Anda berada di luar area kantor. Aktifkan mode WFH jika bekerja dari rumah.",
    }
  }

  return { within: true, blocked: false }
}
