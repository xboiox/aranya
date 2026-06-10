/**
 * Memetakan tipe notifikasi ke halaman tujuan saat notifikasi diklik.
 * Mengembalikan null bila notifikasi tidak punya halaman terkait.
 */
export function notificationHref(type: string): string | null {
  switch (type) {
    // Pengajuan masuk → inbox persetujuan approver
    case "leave_request":
      return "/dashboard/leave/approvals"
    case "overtime_request":
      return "/dashboard/overtime/approvals"
    case "kpi_agreed":
    case "kpi_revision":
    case "kpi_progress":
      return "/dashboard/kpi/team"

    // Keputusan / aksi → halaman penerima
    case "leave_approved":
    case "leave_rejected":
      return "/dashboard/leave"
    case "overtime_approved":
    case "overtime_rejected":
      return "/dashboard/overtime"
    case "kpi_proposed":
    case "kpi_feedback":
      return "/dashboard/kpi"

    case "payslip":
      return "/dashboard/payslip"

    default:
      return null
  }
}
