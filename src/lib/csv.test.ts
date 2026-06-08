import { describe, it, expect } from "vitest"
import { csvCell, buildCsv, parseCsv } from "./csv"

describe("csvCell", () => {
  it("membungkus sel dengan koma/kutip/baris baru", () => {
    expect(csvCell("a,b")).toBe('"a,b"')
    expect(csvCell('he said "hi"')).toBe('"he said ""hi"""')
    expect(csvCell("baris\nbaru")).toBe('"baris\nbaru"')
    expect(csvCell("plain")).toBe("plain")
  })
})

describe("buildCsv", () => {
  it("menggabungkan header + baris dengan CRLF", () => {
    const csv = buildCsv(
      ["Nama", "Kota"],
      [
        ["Andi", "Jakarta"],
        ["Budi, Jr", "Bandung"],
      ],
    )
    expect(csv).toBe('Nama,Kota\r\nAndi,Jakarta\r\n"Budi, Jr",Bandung')
  })
})

describe("parseCsv", () => {
  it("mem-parse baris sederhana (CRLF)", () => {
    expect(parseCsv("a,b\r\nc,d")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ])
  })

  it("mendukung field berkutip dengan koma & escape kutip", () => {
    expect(parseCsv('name,note\r\n"Budi, Jr","he said ""hi"""')).toEqual([
      ["name", "note"],
      ["Budi, Jr", 'he said "hi"'],
    ])
  })

  it("mengabaikan BOM dan baris kosong", () => {
    expect(parseCsv("﻿a,b\n\nc,d\n")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ])
  })

  it("menangani koma di dalam kutip lintas baris LF", () => {
    expect(parseCsv("x\n1\n2")).toEqual([["x"], ["1"], ["2"]])
  })
})
