import { describe, it, expect } from "vitest"
import { summarizeWeights, activationProblems } from "./validation"

const row = (employeeId: string, weight: number, status: string, employeeName = employeeId) => ({
  employeeId,
  employeeName,
  weight,
  status,
})

describe("summarizeWeights", () => {
  it("menjumlahkan bobot & menandai allAgreed per karyawan", () => {
    const s = summarizeWeights([
      row("e1", 60, "agreed"),
      row("e1", 40, "agreed"),
      row("e2", 50, "proposed"),
    ])
    const e1 = s.find((x) => x.employeeId === "e1")!
    expect(e1.totalWeight).toBe(100)
    expect(e1.count).toBe(2)
    expect(e1.allAgreed).toBe(true)
    const e2 = s.find((x) => x.employeeId === "e2")!
    expect(e2.allAgreed).toBe(false)
  })
})

describe("activationProblems", () => {
  it("tanpa KPI → ada masalah", () => {
    expect(activationProblems([])).toHaveLength(1)
  })

  it("bobot ≠ 100 → masalah", () => {
    const p = activationProblems([row("e1", 80, "agreed", "Budi")])
    expect(p.some((x) => x.includes("Budi") && x.includes("80%"))).toBe(true)
  })

  it("ada KPI belum disetujui → masalah", () => {
    const p = activationProblems([row("e1", 100, "proposed", "Budi")])
    expect(p.some((x) => x.includes("belum disetujui"))).toBe(true)
  })

  it("semua agreed & bobot 100% → tidak ada masalah", () => {
    const p = activationProblems([
      row("e1", 100, "agreed"),
      row("e2", 50, "agreed"),
      row("e2", 50, "agreed"),
    ])
    expect(p).toEqual([])
  })
})
