# Aranya HRIS — Product Requirements Document

**Versi:** 0.1.0  
**Tanggal:** 2026-06-05  
**Status:** Draft

---

## 1. Visi Produk

Aranya adalah platform HRIS (Human Resource Information System) berbasis SaaS untuk pasar Indonesia. Dirancang untuk mendukung multi-tenant (multi-perusahaan), dapat diakses melalui browser desktop maupun mobile, dengan arsitektur yang siap dikembangkan menjadi native app.

**Tagline:** Satu platform untuk semua kebutuhan HR perusahaan Anda.

---

## 2. Target Pengguna

| Persona | Deskripsi |
|---------|-----------|
| **Super Admin Aranya** | Operator platform — mengelola tenant, konfigurasi global (rate PPh 21, BPJS) |
| **HR Admin** | Admin per perusahaan — mengelola data karyawan, payroll, konfigurasi perusahaan |
| **Manager / Direct Lead** | Melakukan approval cuti, klaim, KPI, dan overtime bawahan |
| **Karyawan** | Akses self-service: absensi, cuti, klaim, slip gaji, KPI |

---

## 3. Model Lisensi

Modul 1 bersifat **wajib**. Modul 2 & 3 adalah add-on **independen** — masing-masing hanya
butuh Modul 1 (tidak ada dependency antar add-on). Lihat [MODULES.md](./MODULES.md).

**Billing:** Per user aktif / bulan × modul yang diaktifkan.

| Tier | Modul | Deskripsi |
|------|-------|-----------|
| Wajib | Modul 1 | Core HR & Employee Self-Service |
| Add-on | Modul 2 | HR Operations & Performance Development |
| Add-on | Modul 3 | Payroll & Compliance |

---

## 4. Platform Core

Fitur ini tersedia di semua modul dan tidak dijual terpisah:

- **RBAC (Role-Based Access Control):** Super Admin, HR Admin, Manager, Employee — terisolasi per tenant
- **Notifikasi:** In-app notification + email fallback (untuk approval pending, pengingat kontrak, dll.)
- **Audit Trail:** Log semua perubahan data sensitif — penting untuk compliance payroll
- **Tenant Configuration:** Jam kerja, hari libur nasional & company holiday, BPJS kategori risiko, PTKP karyawan
- **Approval Workflow:** 1-level approval via direct lead (Manager)
- **Rate Management:** PPh 21 dan BPJS dikelola oleh Super Admin Aranya (berlaku global semua tenant)

---

## 5. Modul 1 — Core HR & Employee Self-Service

### 5.1 Employee Master Data
- Data personal: nama, NIK, NPWP, tanggal lahir, alamat, no. rekening bank
- Data kepegawaian: jabatan, divisi, tanggal join, status (PKWT/PKWTT/probation/kontrak)
- BPJS: nomor JKN dan BPJS Ketenagakerjaan
- Riwayat jabatan dan perpindahan divisi
- Upload dokumen: KTP, ijazah, kontrak kerja (tersimpan di Google Cloud Storage)

### 5.2 Organizational Structure & Reporting Line
- Hierarki jabatan dan divisi/departemen
- Reporting line (siapa melapor ke siapa) — digunakan sebagai dasar approval chain
- Visualisasi org chart

### 5.3 Absensi + GPS
- Check-in dan check-out dengan timestamp
- Pencatatan koordinat GPS saat absensi
- Geofencing: HR Admin dapat mengaktifkan/menonaktifkan, menentukan titik pusat dan radius (meter)
- Mode WFH: karyawan dapat mengaktifkan flag WFH saat absen, tercatat di data absensi
- Offline handling: data tersimpan lokal (IndexedDB), auto-sync saat koneksi tersedia
- Timestamp yang dicatat adalah waktu absen offline (bukan waktu sync)

### 5.4 Shift & Jadwal Kerja
- Definisi shift (pagi/siang/malam) dengan jam masuk dan keluar
- Penjadwalan roster per tim/divisi
- Integrasi dengan kalender hari libur nasional dan company holiday

### 5.5 Leave Management
- Pengajuan cuti oleh karyawan (tahunan, sakit, melahirkan, dll.)
- Approval oleh direct lead (1 level)
- Saldo cuti per karyawan, riwayat pengajuan
- Kalender cuti tim

### 5.6 Overtime — Pencatatan
- Pengajuan lembur oleh karyawan (jam mulai, jam selesai, keterangan)
- Approval oleh direct lead
- Riwayat lembur tercatat di profil karyawan
- *Catatan: perhitungan bayaran lembur ada di Modul 3*

### 5.7 Slip Gaji — Download
- HR Admin upload file PDF slip gaji per karyawan per periode
- Karyawan dapat mendownload slip gaji miliknya
- *Catatan: generate otomatis slip gaji ada di Modul 3*

---

## 6. Modul 2 — HR Operations & Performance Development

Fokus pada **orang**: kinerja, pengembangan, operasi HR. (Add-on independen, butuh Modul 1.)

### 6.1 KPI / Performance Management (scorecard berjenjang — lihat `KPI_DESIGN.md §11`)
- **Struktur:** scorecard per karyawan = **Epic → Task → Sub-task**. Bobot 2 tingkat (Σ Epic =
  100%, Σ Task per Epic = 100%). Tiap Task punya **rubrik skor 1–5** (target = 3) + target note.
  Sub-task opsional dibuat karyawan.
- **Perencanaan:** HR menetapkan periode + target perusahaan; **manajer langsung** menyusun
  scorecard untuk bawahan; karyawan **menyetujui atau minta revisi** (goal agreement).
- **Eksekusi:** karyawan menambah sub-task, memperbarui progres + mengunggah bukti; manajer feedback.
- **Penilaian:** karyawan isi realization + self score (1–5); manajer menilai (1–5); HR mengunci
  periode & mengkalibrasi skor akhir.
- **Skor akhir** = Σ(bobot epic × Σ(bobot task × skor final)), rentang 1–5 → referensi **Bonus**.

### 6.2 Bonus Management
- HR Admin mengkonfigurasi formula bonus per perusahaan/divisi/jabatan
- HR Admin secara manual men-trigger kalkulasi bonus pada periode tertentu
- Sistem menggunakan formula + referensi KPI score → menghasilkan angka bonus
- HR Admin review dan approve sebelum angka bonus disepakati
- Formula contoh: `Bonus = Gaji Pokok × Persentase × (KPI Score / 100)`
- *Jika Modul 3 (Payroll) aktif, angka bonus dapat mengalir ke komponen payroll*

### 6.3 Training & Development
- Rencana pelatihan per karyawan
- Tracking sertifikasi dan masa berlaku
- Riwayat training

### 6.4 Asset Management
- Pencatatan aset perusahaan yang dipinjamkan (laptop, HP, kendaraan, kartu akses)
- Linked ke profil karyawan
- Status aset: aktif / dikembalikan
- Integrasi dengan proses offboarding

### 6.5 Onboarding & Offboarding
- Checklist onboarding karyawan baru: dokumen, akses sistem, equipment
- Proses offboarding: serah terima aset, clearance form, exit interview
- Status tracking per item checklist

### 6.6 Discipline & Warning Management
- Pencatatan Surat Peringatan: SP1, SP2, SP3
- Riwayat pelanggaran per karyawan
- Eskalasi otomatis jika sudah SP3

### 6.7 HR Analytics Dashboard
- Headcount report, turnover rate, absensi rate
- Distribusi usia, masa kerja, level pendidikan
- Laporan lembur dan klaim per divisi
- Visualisasi data untuk C-level dan HRD

### 6.8 Integrasi Pihak Ketiga
- Webhook dan REST API untuk integrasi sistem eksternal
- Konektor ATS (Applicant Tracking System): sinkronisasi data karyawan baru dari ATS ke Aranya
- Dokumentasi API publik untuk integrasi custom

---

## 7. Modul 3 — Payroll & Compliance

Fokus pada **uang & kepatuhan**: penggajian, pajak, BPJS. **Risiko tertinggi** — dikerjakan
paling akhir dengan persiapan & pengujian matang. (Add-on independen, butuh Modul 1.)

### 7.1 Overtime — Perhitungan Bayaran
- Kalkulasi uang lembur berdasarkan jam lembur yang sudah diapprove (Modul 1)
- Formula lembur sesuai regulasi ketenagakerjaan Indonesia
- Output terintegrasi ke komponen payroll

### 7.2 Claim Management
- Medical claim: pengajuan dengan bukti struk/faktur (upload ke GCS)
- Reimbursement business trip: pengajuan dengan detail perjalanan dan bukti
- Approval oleh direct lead
- Status tracking: pending → approved/rejected → dibayar

### 7.3 Payroll Calculator
- Komponen gaji: gaji pokok, tunjangan, potongan, lembur, bonus (jika M2 aktif), klaim
- **PPh 21 metode TER** (Tarif Efektif Rata-rata, PP 58/2023 — wajib sejak Jan 2024) untuk
  perhitungan bulanan + rekonsiliasi progresif (UU HPP) di akhir tahun
- Perhitungan BPJS Kesehatan (employer + employee, dengan cap upah)
- Perhitungan BPJS Ketenagakerjaan: JKK (per risiko), JKM, JHT, JP
- Rate TER/PTKP/BPJS dikelola oleh Super Admin Aranya (regulasi nasional)

### 7.4 Slip Gaji — Generate Otomatis
- Generate PDF slip gaji dari hasil kalkulasi payroll
- Format slip gaji dapat dikustomisasi per tenant
- Karyawan otomatis dapat mengakses slip gaji setelah payroll diproses

---

## 8. Non-Functional Requirements

| Kategori | Requirement |
|----------|-------------|
| **Multi-tenancy** | Shared database dengan isolasi `tenant_id` + PostgreSQL RLS |
| **Aksesibilitas** | Web browser (desktop & mobile), PWA (installable) |
| **Mobile** | Responsive UI, PWA dengan offline support untuk absensi |
| **File Storage** | Google Cloud Storage untuk semua dokumen dan media |
| **Regulasi** | Fokus pasar Indonesia: PPh 21, BPJS Ketenagakerjaan, BPJS Kesehatan |
| **Performa** | Halaman utama < 2 detik, absensi GPS < 3 detik |
| **Keamanan** | RBAC, audit trail, tidak ada data cross-tenant |
| **Notifikasi** | In-app + email fallback |

---

## 9. Out of Scope (v1.0)

- Rekrutmen & Applicant Tracking System (ATS) — sudah ada aplikasi terpisah, cukup integrasi
- Multi-currency — fokus Indonesia (IDR)
- Native mobile app — direncanakan setelah PWA stabil
- Multi-level approval workflow — cukup 1 level (direct lead) untuk v1.0
