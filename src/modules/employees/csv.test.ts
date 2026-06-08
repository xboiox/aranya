import { describe, it, expect } from "vitest"
import { employeesToCsv, employeeStatusText } from "./csv"
import type { EmployeeListItem } from "./queries"

const base: EmployeeListItem = {
  id: "e1",
  name: "Andi",
  email: "andi@acme.id",
  position: "Engineer",
  department: "Engineering",
  managerName: "Sari",
  isActive: true,
  isActivated: true,
}

describe("employeeStatusText", () => {
  it("Aktif bila aktif & sudah aktivasi", () => {
    expect(employeeStatusText(base)).toBe("Aktif")
  })
  it("Menunggu aktivasi bila belum set password", () => {
    expect(employeeStatusText({ ...base, isActivated: false })).toBe("Menunggu aktivasi")
  })
  it("Nonaktif bila isActive false", () => {
    expect(employeeStatusText({ ...base, isActive: false })).toBe("Nonaktif")
  })
})

describe("employeesToCsv", () => {
  it("header + baris dengan atasan langsung", () => {
    const csv = employeesToCsv([
      base,
      { ...base, id: "e2", name: "Budi", managerName: null, department: null },
    ])
    const lines = csv.split("\r\n")
    expect(lines[0]).toBe("Nama,Email,Jabatan,Departemen,Atasan Langsung,Status")
    expect(lines[1]).toBe("Andi,andi@acme.id,Engineer,Engineering,Sari,Aktif")
    expect(lines[2]).toBe("Budi,andi@acme.id,Engineer,,,Aktif")
  })
})
