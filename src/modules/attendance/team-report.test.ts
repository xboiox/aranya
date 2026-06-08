import { describe, it, expect } from "vitest"
import {
  filterTeamRows,
  teamRowsToCsv,
  attendanceStatus,
  csvCell,
  isTeamStatus,
  buildTeamGrid,
  eachDateInRange,
} from "./team-report"
import type { TeamAttendanceRow } from "./queries"

const d = (s: string) => new Date(s)
const checkIn = d("2026-06-08T01:05:00Z") // 08:05 WIB
const checkOut = d("2026-06-08T10:00:00Z") // 17:00 WIB
const day = d("2026-06-08T00:00:00Z")

const rows: TeamAttendanceRow[] = [
  { employeeId: "e1", name: "Andi", department: "Engineering", date: day, checkInAt: checkIn, checkOutAt: checkOut, isLate: false },
  { employeeId: "e2", name: "Budi", department: "Sales", date: day, checkInAt: checkIn, checkOutAt: null, isLate: true },
  { employeeId: "e3", name: "Citra", department: null, date: day, checkInAt: null, checkOutAt: null, isLate: null },
]

describe("attendanceStatus", () => {
  it("absent bila tak ada check-in", () => expect(attendanceStatus(rows[2])).toBe("absent"))
  it("late bila isLate true", () => expect(attendanceStatus(rows[1])).toBe("late"))
  it("present bila check-in & tidak telat", () => expect(attendanceStatus(rows[0])).toBe("present"))
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
  it("header + baris dengan departemen, status & jam WIB", () => {
    const csv = teamRowsToCsv(rows)
    const lines = csv.split("\r\n")
    expect(lines[0]).toBe("Tanggal,Nama,Departemen,Masuk,Keluar,Status")
    expect(lines[1]).toBe("2026-06-08,Andi,Engineering,08:05,17:00,Hadir")
    expect(lines[2]).toBe("2026-06-08,Budi,Sales,08:05,,Terlambat")
    expect(lines[3]).toBe("2026-06-08,Citra,,,,Alpha")
  })
})

describe("isTeamStatus", () => {
  it("memvalidasi nilai", () => {
    expect(isTeamStatus("late")).toBe(true)
    expect(isTeamStatus("foo")).toBe(false)
  })
})

describe("eachDateInRange", () => {
  it("inklusif start–end", () => {
    const dates = eachDateInRange(d("2026-06-08T00:00:00Z"), d("2026-06-10T00:00:00Z"))
    expect(dates.map((x) => x.toISOString().slice(0, 10))).toEqual([
      "2026-06-08",
      "2026-06-09",
      "2026-06-10",
    ])
  })
  it("satu hari bila start == end", () => {
    expect(eachDateInRange(day, day)).toHaveLength(1)
  })
  it("dibatasi 92 hari", () => {
    const dates = eachDateInRange(d("2026-01-01T00:00:00Z"), d("2026-12-31T00:00:00Z"))
    expect(dates).toHaveLength(92)
  })
})

describe("buildTeamGrid", () => {
  const employees = [
    { employeeId: "e1", name: "Andi", department: "Eng" },
    { employeeId: "e2", name: "Budi", department: "Sales" },
  ]
  const dates = eachDateInRange(d("2026-06-08T00:00:00Z"), d("2026-06-09T00:00:00Z"))

  it("satu baris per karyawan per tanggal (absen → null)", () => {
    const att = [
      { employeeId: "e1", date: d("2026-06-08T00:00:00Z"), checkInAt: checkIn, checkOutAt: checkOut, isLate: false },
    ]
    const grid = buildTeamGrid(employees, att, dates)
    expect(grid).toHaveLength(4) // 2 karyawan × 2 hari
    const e1d8 = grid.find((r) => r.employeeId === "e1" && r.date.toISOString().startsWith("2026-06-08"))
    expect(e1d8?.checkInAt).toEqual(checkIn)
    const e2d8 = grid.find((r) => r.employeeId === "e2" && r.date.toISOString().startsWith("2026-06-08"))
    expect(e2d8?.checkInAt).toBeNull()
  })
})
