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

    // Keputusan → halaman pemohon
    case "leave_approved":
    case "leave_rejected":
      return "/dashboard/leave"
    case "overtime_approved":
    case "overtime_rejected":
      return "/dashboard/overtime"

    case "payslip":
      return "/dashboard/payslip"

    default:
      return null
  }
}
