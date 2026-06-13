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

/** Status periode KPI (planning/active/appraisal/locked) → varian Badge. */
export function periodStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case "planning":
      return "warning"
    case "active":
      return "info"
    case "appraisal":
      return "default"
    case "locked":
      return "muted"
    default:
      return "secondary"
  }
}

/** Status scorecard KPI (draft/proposed/agreed/revision_requested) → varian Badge. */
export function scorecardStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case "agreed":
      return "success"
    case "proposed":
      return "warning"
    case "revision_requested":
      return "destructive"
    case "draft":
      return "muted"
    default:
      return "secondary"
  }
}
