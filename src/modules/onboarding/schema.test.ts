import { describe, it, expect } from "vitest"
import {
  addTaskSchema,
  isChecklistType,
  DEFAULT_CHECKLIST,
} from "./schema"

describe("addTaskSchema", () => {
  it("menerima tugas valid", () => {
    const r = addTaskSchema.safeParse({
      employeeId: "emp-1",
      type: "onboarding",
      task: "Tanda tangan kontrak",
    })
    expect(r.success).toBe(true)
  })

  it("menolak tugas kosong", () => {
    const r = addTaskSchema.safeParse({ employeeId: "emp-1", type: "onboarding", task: "  " })
    expect(r.success).toBe(false)
  })

  it("menolak tipe tidak dikenal", () => {
    const r = addTaskSchema.safeParse({ employeeId: "emp-1", type: "lain", task: "X" })
    expect(r.success).toBe(false)
  })

  it("menolak employeeId kosong", () => {
    const r = addTaskSchema.safeParse({ employeeId: "", type: "offboarding", task: "X" })
    expect(r.success).toBe(false)
  })
})

describe("isChecklistType", () => {
  it("mengenali tipe valid", () => {
    expect(isChecklistType("onboarding")).toBe(true)
    expect(isChecklistType("offboarding")).toBe(true)
  })
  it("menolak nilai lain", () => {
    expect(isChecklistType("foo")).toBe(false)
    expect(isChecklistType(undefined)).toBe(false)
  })
})

describe("DEFAULT_CHECKLIST", () => {
  it("punya template untuk kedua tipe & item unik", () => {
    for (const type of ["onboarding", "offboarding"] as const) {
      const items = DEFAULT_CHECKLIST[type]
      expect(items.length).toBeGreaterThan(0)
      expect(new Set(items).size).toBe(items.length)
    }
  })
})
