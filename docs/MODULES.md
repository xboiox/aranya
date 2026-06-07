# Aranya HRIS — Struktur Modul & Lisensi

**Versi:** 2.0.0  
**Tanggal:** 2026-06-07  
**Status:** Final (struktur ditukar pada 2026-06-07 — payroll dipindah ke tier teratas)

Dokumen ini adalah **single source of truth** untuk struktur modul & lisensi.

---

## Ringkasan

| Kode | Modul | Tier | Lisensi |
|------|-------|------|---------|
| `MODULE_1` | Core HR & Employee Self-Service | Wajib | Selalu aktif |
| `MODULE_2` | HR Operations & Performance Development | Add-on | Independen (cukup butuh M1) |
| `MODULE_3` | Payroll & Compliance | Add-on | Independen (cukup butuh M1) |

**Billing:** per user aktif / bulan × modul yang diaktifkan.

**Dependency:** Modul 2 & 3 adalah **add-on independen** — masing-masing hanya butuh Modul 1.
Tidak ada lagi aturan "M3 butuh M2". Tenant bisa beli M3 (Payroll) saja tanpa M2, atau sebaliknya.

> **Catatan riwayat:** Awalnya M2 = Payroll dan M3 = HR Operations, dengan M3 bergantung pada M2.
> Pada 2026-06-07 ditukar agar **urutan modul = urutan risiko/pengerjaan** (Payroll yang paling
> kompleks & premium ada di tier teratas) dan dependency dihapus (add-on independen).

---

## Modul 1 — Core HR & Employee Self-Service `[WAJIB]` ✅ Selesai

Fondasi semua tenant. Platform core (RBAC, notifikasi, audit, tenant config, approval engine,
RLS multi-tenant, module gating) termasuk di sini.

- Employee Master Data + Reporting Line
- Organizational Structure & Org Chart
- Absensi GPS + geofencing + WFH + akurasi
- Shift & jadwal kerja + deteksi terlambat
- HR attendance view + koreksi
- Leave Management + approval (hari libur, anti-overlap, cancel)
- Overtime **pencatatan** + approval
- Slip gaji **upload/download** (HR upload manual)
- Audit log viewer, navigasi mobile

---

## Modul 2 — HR Operations & Performance Development `[add-on]`

Fokus pada **orang**: kinerja, pengembangan, operasi HR. Risiko rendah–sedang (pola CRUD + workflow).

- **KPI Management** + approval (indikator per jabatan, isi nilai, approve, riwayat skor)
- **Bonus** (formula dikonfigurasi HR, memakai skor KPI; trigger manual)
- **Training & Development** (rencana, sertifikasi + masa berlaku)
- **Asset Management** (aset dipinjamkan ke karyawan, integrasi offboarding)
- **Onboarding / Offboarding** (checklist)
- **Discipline** (SP1/SP2/SP3)
- **HR Analytics Dashboard** (headcount, turnover, absensi, cuti)
- **Integrasi Pihak Ketiga** (ATS, webhook/API)

---

## Modul 3 — Payroll & Compliance `[add-on]`

Fokus pada **uang & kepatuhan**: penggajian, pajak, BPJS. **Risiko tertinggi** — perhitungan
finansial & regulasi. Dikerjakan paling akhir dengan persiapan & pengujian matang.

- **Overtime pay** (perhitungan bayaran lembur dari jam lembur yang sudah diapprove di M1)
- **Claims** (medical & reimbursement business trip — uang keluar)
- **Payroll Calculator**:
  - PPh 21 metode **TER** (Tarif Efektif Rata-rata, PP 58/2023 — wajib sejak Jan 2024) bulanan +
    rekonsiliasi progresif (UU HPP) akhir tahun
  - BPJS Kesehatan & Ketenagakerjaan (JKK per risiko, JKM, JHT, JP) dengan cap upah
  - Komponen: gaji pokok + tunjangan + lembur + bonus (jika M2 aktif) + klaim − potongan
- **Slip gaji otomatis** (generate dari hasil payroll → pakai storage + download yang sudah ada)

**Rate management** (tarif TER/PTKP/BPJS) dikelola **Super Admin Aranya** (regulasi nasional,
berlaku global semua tenant).

**Interaksi lintas-modul:** Payroll (M3) dapat memakai **Bonus** dari M2 jika M2 aktif. Jika M2
tidak aktif, payroll tetap jalan tanpa komponen bonus (atau HR input manual).

---

## Mapping Teknis

- Kode modul tersimpan di tabel `tenant_modules` (`module_code` + `is_active`).
- Konstanta: `MODULE_CODES` di [src/lib/db/schema/tenants.ts](../src/lib/db/schema/tenants.ts),
  label di [src/lib/modules.ts](../src/lib/modules.ts).
- Gating: `isModuleActive(tenantId, code)` + `getActiveModules(tenantId)`; nav otomatis tersaring
  per modul aktif; halaman ter-gate pakai komponen `<ModuleLocked />`.
