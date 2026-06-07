import { describe, it, expect } from "vitest"
import { parseTimeToMinutes, computeDurationMinutes, formatMinutes } from "./time"

describe("parseTimeToMinutes", () => {
  it("parse jam valid", () => {
    expect(parseTimeToMinutes("00:00")).toBe(0)
    expect(parseTimeToMinutes("18:30")).toBe(18 * 60 + 30)
    expect(parseTimeToMinutes("23:59")).toBe(23 * 60 + 59)
  })
  it("tolak format/nilai tidak valid", () => {
    expect(parseTimeToMinutes("24:00")).toBeNull()
    expect(parseTimeToMinutes("18:60")).toBeNull()
    expect(parseTimeToMinutes("8:30")).toBeNull()
    expect(parseTimeToMinutes("abc")).toBeNull()
  })
})

describe("computeDurationMinutes", () => {
  it("durasi normal dalam hari yang sama", () => {
    expect(computeDurationMinutes("18:00", "20:00")).toBe(120)
    expect(computeDurationMinutes("18:00", "20:30")).toBe(150)
  })
  it("lembur lewat tengah malam", () => {
    expect(computeDurationMinutes("22:00", "02:00")).toBe(240)
    expect(computeDurationMinutes("23:30", "00:30")).toBe(60)
  })
  it("durasi nol atau format salah → null", () => {
    expect(computeDurationMinutes("18:00", "18:00")).toBeNull()
    expect(computeDurationMinutes("xx", "20:00")).toBeNull()
  })
})

describe("formatMinutes", () => {
  it("memformat dengan benar", () => {
    expect(formatMinutes(150)).toBe("2j 30m")
    expect(formatMinutes(120)).toBe("2j")
    expect(formatMinutes(45)).toBe("45m")
  })
})
