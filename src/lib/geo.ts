// Perhitungan jarak geografis untuk validasi geofencing absensi.

const EARTH_RADIUS_METERS = 6_371_000

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180
}

/**
 * Jarak antara dua titik koordinat (meter) menggunakan formula Haversine.
 */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_METERS * c
}

export interface GeofencePoint {
  latitude: number
  longitude: number
  radiusMeters: number
}

/**
 * True jika titik (lat,lng) berada dalam radius minimal satu geofence.
 */
export function isWithinAnyGeofence(
  lat: number,
  lng: number,
  fences: GeofencePoint[],
): boolean {
  return fences.some(
    (f) => haversineMeters(lat, lng, f.latitude, f.longitude) <= f.radiusMeters,
  )
}
