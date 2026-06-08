import { buildCsv } from "@/lib/csv"
import type { EmployeeListItem } from "./queries"

export function employeeStatusText(e: EmployeeListItem): string {
  if (!e.isActive) return "Nonaktif"
  return e.isActivated ? "Aktif" : "Menunggu aktivasi"
}

export function employeesToCsv(items: EmployeeListItem[]): string {
  return buildCsv(
    ["Nama", "Email", "Jabatan", "Departemen", "Atasan Langsung", "Status"],
    items.map((e) => [
      e.name ?? "",
      e.email,
      e.position ?? "",
      e.department ?? "",
      e.managerName ?? "",
      employeeStatusText(e),
    ]),
  )
}
