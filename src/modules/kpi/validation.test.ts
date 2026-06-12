import { describe, it, expect } from "vitest"
import {
  scorecardWeightProblems,
  activationProblems,
  epicScore,
  scorecardScore,
  lockProblems,
} from "./validation"

describe("scorecardWeightProblems", () => {
  it("valid: bobot epic 100% & tiap epic task 100%", () => {
    expect(
      scorecardWeightProblems([
        { name: "Financial", weight: 60, taskWeights: [60, 40] },
        { name: "Productivity", weight: 40, taskWeights: [100] },
      ]),
    ).toEqual([])
  })
  it("kosong → belum ada epic", () => {
    expect(scorecardWeightProblems([])).toEqual(["Belum ada Epic"])
  })
  it("total bobot epic ≠ 100", () => {
    const p = scorecardWeightProblems([{ name: "A", weight: 80, taskWeights: [100] }])
    expect(p.some((x) => x.includes("Total bobot Epic 80%"))).toBe(true)
  })
  it("epic tanpa task & task ≠ 100", () => {
    const p = scorecardWeightProblems([
      { name: "A", weight: 50, taskWeights: [] },
      { name: "B", weight: 50, taskWeights: [70] },
    ])
    expect(p.some((x) => x.includes('Epic "A": belum ada Task'))).toBe(true)
    expect(p.some((x) => x.includes('Epic "B": total bobot Task 70%'))).toBe(true)
  })
})

describe("activationProblems", () => {
  const ok = { employeeName: "Budi", hasScorecard: true, agreed: true, weightProblems: [] }
  it("semua siap → kosong", () => {
    expect(activationProblems([ok])).toEqual([])
  })
  it("tidak ada karyawan wajib", () => {
    expect(activationProblems([])).toHaveLength(1)
  })
  it("belum ada scorecard", () => {
    const p = activationProblems([{ employeeName: "Siti", hasScorecard: false, agreed: false, weightProblems: [] }])
    expect(p[0]).toMatch(/Siti.*belum ada scorecard/)
  })
  it("belum agreed + masalah bobot diberi prefix nama", () => {
    const p = activationProblems([
      { employeeName: "Budi", hasScorecard: true, agreed: false, weightProblems: ["Total bobot Epic 80% (harus 100%)"] },
    ])
    expect(p.some((x) => x.includes("Budi — Total bobot Epic 80%"))).toBe(true)
    expect(p.some((x) => x.includes("Budi: scorecard belum disetujui"))).toBe(true)
  })
})

describe("epicScore & scorecardScore", () => {
  it("epicScore = Σ(final × bobotTask/100)", () => {
    // 60% × 4 + 40% × 5 = 2.4 + 2.0 = 4.4
    expect(epicScore([
      { weight: 60, finalScore: 4 },
      { weight: 40, finalScore: 5 },
    ])).toBe(4.4)
  })
  it("scorecardScore = Σ(skorEpic × bobotEpic/100)", () => {
    // Epic Financial 20% skor 4.4 → 0.88 (sesuai contoh gambar)
    const s = scorecardScore([
      { weight: 20, tasks: [{ weight: 60, finalScore: 4 }, { weight: 40, finalScore: 5 }] },
      { weight: 80, tasks: [{ weight: 100, finalScore: 3 }] },
    ])
    // 0.88 + (3 × 0.8) = 0.88 + 2.4 = 3.28
    expect(s).toBe(3.28)
  })
  it("null bila ada finalScore belum diisi", () => {
    expect(scorecardScore([{ weight: 100, tasks: [{ weight: 100, finalScore: null }] }])).toBeNull()
    expect(epicScore([])).toBeNull()
  })
})

describe("lockProblems", () => {
  it("lapor task belum dinilai manajer", () => {
    const p = lockProblems([
      { employeeName: "Budi", managerScore: 4 },
      { employeeName: "Budi", managerScore: null },
    ])
    expect(p).toHaveLength(1)
    expect(p[0]).toMatch(/belum dinilai/)
  })
  it("kosong bila semua dinilai", () => {
    expect(lockProblems([{ employeeName: "Budi", managerScore: 5 }])).toEqual([])
  })
})
