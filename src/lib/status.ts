import type { BadgeVariant } from "@/components/ui/badge"

/**
 * Memetakan status pengajuan (cuti, lembur, dll) ke varian Badge.
 * Dipakai lintas modul agar warna status seragam & dark-mode aware.
 */
export function requestStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case "approved":
      return "success"
    case "pending":
      return "warning"
    case "rejected":
      return "destructive"
    case "cancelled":
      return "muted"
    default:
      return "secondary"
  }
}
