import { describe, it, expect } from "vitest"
import { toBreakdown } from "./transform"

describe("toBreakdown", () => {
  it("mengurutkan menurun berdasarkan jumlah", () => {
    const out = toBreakdown([
      { key: "Sales", value: 2 },
      { key: "Engineering", value: 5 },
      { key: "HR", value: 1 },
    ])
    expect(out.map((b) => b.label)).toEqual(["Engineering", "Sales", "HR"])
  })

  it("memetakan key null menjadi 'Tidak diset'", () => {
    const out = toBreakdown([{ key: null, value: 3 }])
    expect(out[0]).toEqual({ label: "Tidak diset", count: 3 })
  })

  it("menerapkan labelMap bila tersedia", () => {
    const out = toBreakdown([{ key: "male", value: 4 }], { male: "Laki-laki" })
    expect(out[0].label).toBe("Laki-laki")
  })

  it("mengubah value (mis. bigint string) menjadi number", () => {
    const out = toBreakdown([{ key: "X", value: "7" as unknown as number }])
    expect(out[0].count).toBe(7)
    expect(typeof out[0].count).toBe("number")
  })
})
