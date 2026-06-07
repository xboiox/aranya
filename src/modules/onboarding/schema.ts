import { z } from "zod"

export type ChecklistType = "onboarding" | "offboarding"

export const CHECKLIST_TYPE_LABEL: Record<ChecklistType, string> = {
  onboarding: "Onboarding",
  offboarding: "Offboarding",
}

export function isChecklistType(v: unknown): v is ChecklistType {
  return v === "onboarding" || v === "offboarding"
}

export const addTaskSchema = z.object({
  employeeId: z.string().min(1, "Karyawan wajib dipilih"),
  type: z.enum(["onboarding", "offboarding"], {
    errorMap: () => ({ message: "Tipe checklist tidak valid" }),
  }),
  task: z.string().trim().min(1, "Tugas tidak boleh kosong").max(200),
})

// Template default — diterapkan via tombol "checklist standar".
export const DEFAULT_CHECKLIST: Record<ChecklistType, string[]> = {
  onboarding: [
    "Tanda tangan kontrak kerja",
    "Pengisian data pribadi & rekening gaji",
    "Setup akun email & sistem internal",
    "Penyerahan aset (laptop, kartu akses, dll.)",
    "Orientasi & perkenalan tim",
    "Briefing kebijakan & peraturan perusahaan",
  ],
  offboarding: [
    "Exit interview",
    "Serah terima pekerjaan & dokumen",
    "Pengembalian aset perusahaan",
    "Penonaktifan akun & akses sistem",
    "Penyelesaian administrasi & gaji akhir",
  ],
}
