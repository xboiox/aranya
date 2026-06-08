import { describe, it, expect } from "vitest"
import { csvCell, buildCsv } from "./csv"

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
