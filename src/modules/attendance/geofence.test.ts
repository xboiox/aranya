import { describe, it, expect } from "vitest"
import { evaluateAttendance, MAX_ACCURACY_METERS } from "./geofence"

const office = { latitude: -6.2, longitude: 106.8, radiusMeters: 100 }

const base = {
  latitude: -6.2,
  longitude: 106.8,
  accuracy: 10,
  geofencingEnabled: true,
  locations: [office],
}

describe("evaluateAttendance", () => {
  it("WFH → tidak diblokir, within null (validasi dilewati)", () => {
    const d = evaluateAttendance({ ...base, isWfh: true, latitude: -7, longitude: 110 })
    expect(d.blocked).toBe(false)
    expect(d.within).toBeNull()
  })

  it("geofencing nonaktif → tidak diblokir, within null", () => {
    const d = evaluateAttendance({ ...base, isWfh: false, geofencingEnabled: false })
    expect(d.blocked).toBe(false)
    expect(d.within).toBeNull()
  })

  it("tidak ada titik lokasi → tidak diblokir", () => {
    const d = evaluateAttendance({ ...base, isWfh: false, locations: [] })
    expect(d.blocked).toBe(false)
    expect(d.within).toBeNull()
  })

  it("di dalam geofence + akurasi baik → diizinkan, within true", () => {
    const d = evaluateAttendance({ ...base, isWfh: false })
    expect(d.blocked).toBe(false)
    expect(d.within).toBe(true)
  })

  it("di luar geofence → diblokir, within false", () => {
    const d = evaluateAttendance({ ...base, isWfh: false, latitude: -6.3, longitude: 106.9 })
    expect(d.blocked).toBe(true)
    expect(d.within).toBe(false)
    expect(d.reason).toMatch(/luar area kantor/i)
  })

  it("akurasi terlalu rendah saat geofencing aktif → diblokir", () => {
    const d = evaluateAttendance({ ...base, isWfh: false, accuracy: MAX_ACCURACY_METERS + 50 })
    expect(d.blocked).toBe(true)
    expect(d.reason).toMatch(/akurasi/i)
  })

  it("akurasi null (tak diketahui) tapi di dalam geofence → diizinkan", () => {
    const d = evaluateAttendance({ ...base, isWfh: false, accuracy: null })
    expect(d.blocked).toBe(false)
    expect(d.within).toBe(true)
  })

  it("akurasi buruk tapi WFH → tetap diizinkan (validasi dilewati)", () => {
    const d = evaluateAttendance({ ...base, isWfh: true, accuracy: 9999 })
    expect(d.blocked).toBe(false)
  })
})
