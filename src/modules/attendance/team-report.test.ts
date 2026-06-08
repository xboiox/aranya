import { describe, it, expect } from "vitest"
import {
  filterTeamRows,
  teamRowsToCsv,
  attendanceStatus,
  csvCell,
  isTeamStatus,
} from "./team-report"
import type { TeamAttendanceRow } from "./queries"

const checkIn = new Date("2026-06-08T01:05:00Z") // 08:05 WIB
const checkOut = new Date("2026-06-08T10:00:00Z") // 17:00 WIB

const rows: TeamAttendanceRow[] = [
  { employeeId: "e1", name: "Andi", checkInAt: checkIn, checkOutAt: checkOut, isLate: false },
  { employeeId: "e2", name: "Budi", checkInAt: checkIn, checkOutAt: null, isLate: true },
  { employeeId: "e3", name: "Citra", checkInAt: null, checkOutAt: null, isLate: null },
]

describe("attendanceStatus", () => {
  it("absent bila tak ada check-in", () => {
    expect(attendanceStatus(rows[2])).toBe("absent")
  })
  it("late bila isLate true", () => {
    expect(attendanceStatus(rows[1])).toBe("late")
  })
  it("present bila check-in & tidak telat", () => {
    expect(attendanceStatus(rows[0])).toBe("present")
  })
})

describe("filterTeamRows", () => {
  it("mencari berdasarkan nama (case-insensitive)", () => {
    expect(filterTeamRows(rows, { q: "bud" }).map((r) => r.name)).toEqual(["Budi"])
  })
  it("filter present (termasuk yang telat)", () => {
    expect(filterTeamRows(rows, { status: "present" }).map((r) => r.name)).toEqual(["Andi", "Budi"])
  })
  it("filter absent", () => {
    expect(filterTeamRows(rows, { status: "absent" }).map((r) => r.name)).toEqual(["Citra"])
  })
  it("filter late", () => {
    expect(filterTeamRows(rows, { status: "late" }).map((r) => r.name)).toEqual(["Budi"])
  })
  it("status all + tanpa q mengembalikan semua", () => {
    expect(filterTeamRows(rows, {})).toHaveLength(3)
  })
})

describe("csvCell", () => {
  it("membungkus sel dengan koma/kutip", () => {
    expect(csvCell("a,b")).toBe('"a,b"')
    expect(csvCell('he said "hi"')).toBe('"he said ""hi"""')
    expect(csvCell("plain")).toBe("plain")
  })
})

describe("teamRowsToCsv", () => {
  it("membuat header + baris dengan status & jam WIB", () => {
    const csv = teamRowsToCsv(rows, "2026-06-08")
    const lines = csv.split("\r\n")
    expect(lines[0]).toBe("Tanggal,Nama,Masuk,Keluar,Status")
    expect(lines[1]).toBe("2026-06-08,Andi,08:05,17:00,Hadir")
    expect(lines[2]).toBe("2026-06-08,Budi,08:05,,Terlambat")
    expect(lines[3]).toBe("2026-06-08,Citra,,,Alpha")
  })
})

describe("isTeamStatus", () => {
  it("memvalidasi nilai", () => {
    expect(isTeamStatus("late")).toBe(true)
    expect(isTeamStatus("foo")).toBe(false)
  })
})
