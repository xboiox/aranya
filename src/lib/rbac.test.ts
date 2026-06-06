import { describe, it, expect } from "vitest"
import {
  getHighestPrivilegeRole,
  hasRole,
  hasAnyRole,
  SESSION_DURATIONS,
} from "./rbac"

describe("getHighestPrivilegeRole", () => {
  it("mengembalikan 'employee' untuk array kosong", () => {
    expect(getHighestPrivilegeRole([])).toBe("employee")
  })

  it("memilih role paling privileged dari kombinasi (double role)", () => {
    expect(getHighestPrivilegeRole(["employee", "hr_admin"])).toBe("hr_admin")
    expect(getHighestPrivilegeRole(["manager", "employee"])).toBe("manager")
    expect(getHighestPrivilegeRole(["employee", "super_admin"])).toBe("super_admin")
  })

  it("tidak bergantung pada urutan input", () => {
    expect(getHighestPrivilegeRole(["super_admin", "employee"])).toBe("super_admin")
    expect(getHighestPrivilegeRole(["employee", "super_admin"])).toBe("super_admin")
  })
})

describe("hasRole", () => {
  it("true jika role ada", () => {
    expect(hasRole(["manager", "employee"], "manager")).toBe(true)
  })
  it("false jika role tidak ada", () => {
    expect(hasRole(["employee"], "hr_admin")).toBe(false)
  })
})

describe("hasAnyRole", () => {
  it("true jika minimal satu role cocok", () => {
    expect(hasAnyRole(["employee"], "hr_admin", "employee")).toBe(true)
  })
  it("false jika tidak ada yang cocok", () => {
    expect(hasAnyRole(["employee"], "super_admin", "hr_admin")).toBe(false)
  })
})

describe("SESSION_DURATIONS", () => {
  it("role lebih privileged punya sesi lebih pendek atau sama", () => {
    expect(SESSION_DURATIONS.super_admin).toBeLessThan(SESSION_DURATIONS.hr_admin)
    expect(SESSION_DURATIONS.hr_admin).toBeLessThan(SESSION_DURATIONS.employee)
    expect(SESSION_DURATIONS.manager).toBe(SESSION_DURATIONS.employee)
  })
})
