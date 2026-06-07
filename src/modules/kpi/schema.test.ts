import { describe, it, expect } from "vitest"
import { submitKpiSchema, recentQuarters } from "./schema"

describe("submitKpiSchema", () => {
  it("menerima penilaian valid", () => {
    const r = submitKpiSchema.safeParse({
      period: "2026-Q1",
      score: 85,
      notes: "Capaian target",
    })
    expect(r.success).toBe(true)
  })

  it("menolak format periode tidak valid", () => {
    const r = submitKpiSchema.safeParse({ period: "2026-1", score: 80 })
    expect(r.success).toBe(false)
  })

  it("menolak nilai di luar rentang 0–100", () => {
    expect(submitKpiSchema.safeParse({ period: "2026-Q1", score: 120 }).success).toBe(false)
    expect(submitKpiSchema.safeParse({ period: "2026-Q1", score: -5 }).success).toBe(false)
  })

  it("mengubah string angka menjadi number (coerce)", () => {
    const r = submitKpiSchema.safeParse({ period: "2026-Q1", score: "90" })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.score).toBe(90)
  })

  it("menolak nilai non-integer", () => {
    const r = submitKpiSchema.safeParse({ period: "2026-Q1", score: 87.5 })
    expect(r.success).toBe(false)
  })
})

describe("recentQuarters", () => {
  it("mengembalikan 4 kuartal menurun dari kuartal berjalan", () => {
    // 2026-06-07 → Q2
    const qs = recentQuarters(new Date("2026-06-07T00:00:00Z"))
    expect(qs).toEqual(["2026-Q2", "2026-Q1", "2025-Q4", "2025-Q3"])
  })

  it("menangani pergantian tahun dari Q1", () => {
    const qs = recentQuarters(new Date("2026-02-15T00:00:00Z"))
    expect(qs).toEqual(["2026-Q1", "2025-Q4", "2025-Q3", "2025-Q2"])
  })
})
