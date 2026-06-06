import { describe, it, expect } from "vitest"
import { countWorkingDays, parseDateOnly } from "./date"

const d = (s: string) => new Date(`${s}T00:00:00.000Z`)

describe("countWorkingDays", () => {
  it("Senin–Jumat = 5 hari kerja", () => {
    // 2026-06-01 adalah Senin
    expect(countWorkingDays(d("2026-06-01"), d("2026-06-05"))).toBe(5)
  })

  it("mengecualikan akhir pekan", () => {
    // Senin–Minggu (full week) = 5 hari kerja
    expect(countWorkingDays(d("2026-06-01"), d("2026-06-07"))).toBe(5)
  })

  it("satu hari kerja = 1", () => {
    expect(countWorkingDays(d("2026-06-03"), d("2026-06-03"))).toBe(1)
  })

  it("akhir pekan saja = 0", () => {
    // 2026-06-06 Sabtu, 2026-06-07 Minggu
    expect(countWorkingDays(d("2026-06-06"), d("2026-06-07"))).toBe(0)
  })

  it("end < start = 0", () => {
    expect(countWorkingDays(d("2026-06-10"), d("2026-06-01"))).toBe(0)
  })
})

describe("parseDateOnly", () => {
  it("parse tanggal valid", () => {
    expect(parseDateOnly("2026-06-01")?.toISOString()).toBe("2026-06-01T00:00:00.000Z")
  })
  it("tolak input tidak valid", () => {
    expect(parseDateOnly("bukan-tanggal")).toBeNull()
  })
})
