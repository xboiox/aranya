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

/**
 * Mem-parse teks CSV menjadi array baris (RFC 4180): mendukung field berkutip,
 * escape kutip ganda, koma di dalam kutip, serta LF/CRLF. BOM di awal diabaikan.
 * Baris kosong dilewati.
 */
export function parseCsv(text: string): string[][] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)

  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false
  let i = 0

  const endField = () => {
    row.push(field)
    field = ""
  }
  const endRow = () => {
    endField()
    // Lewati baris yang benar-benar kosong (satu sel kosong).
    if (!(row.length === 1 && row[0] === "")) rows.push(row)
    row = []
  }

  while (i < text.length) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += c
      i++
      continue
    }
    if (c === '"') {
      inQuotes = true
      i++
    } else if (c === ",") {
      endField()
      i++
    } else if (c === "\n") {
      endRow()
      i++
    } else if (c === "\r") {
      i++
    } else {
      field += c
      i++
    }
  }
  // Field/baris terakhir bila tidak diakhiri newline.
  if (field !== "" || row.length > 0) endRow()
  return rows
}
