import { describe, it, expect } from "vitest"
import { visibleSections } from "./nav-config"

describe("visibleSections — role & module gating", () => {
  it("menyembunyikan item ter-gate modul jika modul tidak aktif", () => {
    const sections = visibleSections(["hr_admin"], []) // tanpa MODULE_3
    const allItems = sections.flatMap((s) => s.items.map((i) => i.href))
    expect(allItems).not.toContain("/dashboard/payroll")
  })

  it("menampilkan item ter-gate modul jika modul aktif", () => {
    const sections = visibleSections(["hr_admin"], ["MODULE_3"])
    const allItems = sections.flatMap((s) => s.items.map((i) => i.href))
    expect(allItems).toContain("/dashboard/payroll")
  })

  it("memfilter item berdasarkan role", () => {
    const empItems = visibleSections(["employee"], ["MODULE_3"]).flatMap((s) =>
      s.items.map((i) => i.href),
    )
    // Payroll khusus hr_admin → tidak muncul untuk employee meski modul aktif
    expect(empItems).not.toContain("/dashboard/payroll")
    // Item self-service tetap muncul
    expect(empItems).toContain("/dashboard/attendance")
  })

  it("section kosong (semua item tersembunyi) tidak ditampilkan", () => {
    const sections = visibleSections(["employee"], [])
    // Section "Payroll (Modul 3)" hanya berisi item hr_admin+MODULE_3 → harus hilang
    expect(sections.find((s) => s.title === "Payroll (Modul 3)")).toBeUndefined()
  })
})
