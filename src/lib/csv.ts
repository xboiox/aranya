/** Membungkus sel CSV bila mengandung koma/kutip/baris baru (RFC 4180). */
export function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/** Membangun konten CSV dari header + baris (RFC 4180, pemisah CRLF). */
export function buildCsv(header: string[], rows: string[][]): string {
  return [header, ...rows]
    .map((cells) => cells.map((c) => csvCell(c)).join(","))
    .join("\r\n")
}

/** Prefix BOM agar Excel mengenali UTF-8. */
export const CSV_BOM = "﻿"
