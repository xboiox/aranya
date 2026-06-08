/**
 * Logika otorisasi approval murni (tanpa I/O) agar mudah diuji unit.
 * Dipakai oleh engine approval di `approval.ts`.
 */
export interface ApprovalAuthInput {
  /** userId pemohon. */
  requesterUserId: string
  /** employeeId atasan langsung pemohon (reportsToId), atau null. */
  requesterReportsToId: string | null
  /** userId aktor yang memproses. */
  actorUserId: string
  /** employeeId aktor bila ia karyawan, atau null bila bukan. */
  actorEmployeeId: string | null
  /** Apakah aktor memiliki peran HR Admin. */
  actorIsHr: boolean
}

/**
 * Mengembalikan pesan error bila aktor tidak boleh memproses pengajuan,
 * atau null bila diizinkan. Aturan:
 * - Hanya atasan langsung pemohon ATAU HR Admin yang boleh memproses.
 * - Tidak boleh menyetujui pengajuan milik sendiri.
 */
export function authorizeApproval(input: ApprovalAuthInput): string | null {
  const isDirectLead =
    input.actorEmployeeId != null &&
    input.requesterReportsToId === input.actorEmployeeId

  if (!isDirectLead && !input.actorIsHr) {
    return "Anda tidak berwenang memproses pengajuan ini"
  }
  if (input.requesterUserId === input.actorUserId) {
    return "Anda tidak dapat menyetujui pengajuan sendiri"
  }
  return null
}
