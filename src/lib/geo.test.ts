import { describe, it, expect } from "vitest"
import { haversineMeters, isWithinAnyGeofence } from "./geo"

describe("haversineMeters", () => {
  it("jarak titik yang sama = 0", () => {
    expect(haversineMeters(-6.2, 106.8, -6.2, 106.8)).toBe(0)
  })

  it("menghitung jarak ~ benar (Monas → Bundaran HI, ~2.5 km)", () => {
    // Monas
    const d = haversineMeters(-6.1754, 106.8272, -6.1951, 106.823)
    // ~2.2 km — toleransi luas
    expect(d).toBeGreaterThan(1500)
    expect(d).toBeLessThan(3000)
  })

  it("simetris (A→B == B→A)", () => {
    const ab = haversineMeters(-6.2, 106.8, -6.3, 106.9)
    const ba = haversineMeters(-6.3, 106.9, -6.2, 106.8)
    expect(Math.abs(ab - ba)).toBeLessThan(0.001)
  })
})

describe("isWithinAnyGeofence", () => {
  const office = { latitude: -6.2, longitude: 106.8, radiusMeters: 100 }

  it("true jika tepat di titik kantor", () => {
    expect(isWithinAnyGeofence(-6.2, 106.8, [office])).toBe(true)
  })

  it("false jika jauh dari semua geofence", () => {
    expect(isWithinAnyGeofence(-6.3, 106.9, [office])).toBe(false)
  })

  it("true jika berada dalam salah satu dari beberapa geofence", () => {
    const fences = [
      office,
      { latitude: -6.9, longitude: 107.6, radiusMeters: 150 }, // Bandung
    ]
    expect(isWithinAnyGeofence(-6.9001, 107.6001, fences)).toBe(true)
  })

  it("false untuk array geofence kosong", () => {
    expect(isWithinAnyGeofence(-6.2, 106.8, [])).toBe(false)
  })
})
