# Aranya HRIS — Architecture Decisions

**Versi:** 1.1.0  
**Tanggal:** 2026-06-06  
**Status:** Final

---

## 1. Multi-Tenancy Strategy

**Keputusan:** Shared Database + `tenant_id` + PostgreSQL Row Level Security (RLS)

**Alasan:**
- Paling pragmatis untuk tahap awal SaaS
- Single migration process — mudah dikelola tim kecil
- Biaya infrastruktur lebih efisien dibanding separate database per tenant

**Implementasi:**
- Setiap tabel domain memiliki kolom `tenant_id` (foreign key ke tabel `tenants`)
- PostgreSQL RLS diterapkan sebagai safety net di level database
- Application code tetap wajib mem-filter `tenant_id` — RLS sebagai double protection
- Session context database di-set saat request masuk: `SET app.current_tenant = '<tenant_id>'`

**Trade-off:**
- Risiko data cross-tenant jika ada bug di application layer → dimitigasi dengan RLS
- Query analytics cross-tenant untuk Super Admin harus bypass RLS secara eksplisit

---

## 2. Mobile & Aksesibilitas

**Keputusan:** Progressive Web App (PWA)

**Alasan:**
- Satu codebase untuk desktop browser, mobile browser, dan installable app
- Mendukung offline (IndexedDB) — krusial untuk fitur absensi GPS
- Lebih cepat dilaunching dibanding native app
- API yang dibangun sudah siap dikonsumsi native app di masa depan

**Akses:**
| Mode | Behaviour |
|------|-----------|
| Desktop browser | Web app normal |
| Mobile browser | Responsive, langsung bisa digunakan |
| Mobile installed (Add to Home Screen) | PWA mode: offline support, push notification |

**Catatan:**
- Push notification PWA di iOS hanya berfungsi jika app sudah di-install (iOS 16.4+)
- Email notification diimplementasikan sebagai fallback untuk coverage penuh

---

## 3. GPS Attendance

**Geofencing:**
- HR Admin per tenant dapat mengaktifkan/menonaktifkan geofencing
- HR Admin menentukan titik pusat (latitude, longitude) dan radius (meter)
- Validasi dilakukan di sisi server — koordinat GPS dari client divalidasi terhadap konfigurasi geofencing tenant
- Satu tenant dapat memiliki beberapa titik geofencing (misalnya beberapa lokasi kantor)

**WFH Mode:**
- Karyawan dapat mengaktifkan flag WFH saat melakukan absensi
- Saat WFH aktif, validasi geofencing dilewati
- Flag `is_wfh: boolean` tercatat di tabel absensi

**Offline Handling:**
- Data absensi disimpan di IndexedDB saat tidak ada koneksi
- Saat koneksi tersedia, data di-sync ke server secara otomatis
- Field yang dicatat: `offline_timestamp` (waktu absen sebenarnya) dan `synced_at` (waktu sync)
- Field `is_synced: boolean` untuk audit trail
- Server memvalidasi bahwa `offline_timestamp` tidak terlalu jauh dari `synced_at` (threshold konfigurabel)

---

## 4. File Storage

**Keputusan:** Google Cloud Storage (GCS)

**Penggunaan:**
| Jenis File | Bucket / Path |
|------------|---------------|
| Slip gaji PDF | `payslips/{tenant_id}/{year}/{month}/{employee_id}.pdf` |
| Dokumen karyawan | `documents/{tenant_id}/{employee_id}/{doc_type}/{filename}` |
| Bukti klaim | `claims/{tenant_id}/{claim_id}/{filename}` |
| Foto aset | `assets/{tenant_id}/{asset_id}/{filename}` |

**Akses:**
- File tidak boleh diakses secara publik
- Akses via signed URL dengan TTL pendek (15 menit) yang di-generate oleh backend
- Isolasi antar tenant dijamin melalui path prefix `tenant_id`

---

## 5. Approval Workflow

**Keputusan:** 1-level approval (direct lead)

**Alasan:** Cukup untuk v1.0, menghindari kompleksitas workflow engine yang prematur.

**Berlaku untuk:**
- Pengajuan cuti
- Pengajuan overtime
- Pengajuan klaim (medical & reimbursement)
- Pengisian KPI
- Pengajuan bonus (HR Admin approve sebelum masuk payroll)

**Struktur:**
- Direct lead ditentukan dari Organizational Structure & Reporting Line
- Jika direct lead tidak ada / tidak aktif, notifikasi dikirim ke HR Admin sebagai fallback

---

## 6. Rate Management (PPh 21 & BPJS)

**Keputusan:** Dikelola oleh Super Admin Aranya (bukan per tenant)

**Alasan:** PPh 21 dan BPJS adalah regulasi nasional — seluruh tenant menggunakan angka yang sama.

**Yang dikonfigurasi Super Admin:**
- Tarif PPh 21 progresif (per layer penghasilan kena pajak)
- PTKP (tabel per status perkawinan dan tanggungan)
- BPJS Kesehatan: persentase employer dan employee, batas upah atas
- BPJS Ketenagakerjaan: JKK (per kategori risiko), JKM, JHT, JP

**Yang dikonfigurasi HR Admin per tenant:**
- Kategori risiko kerja perusahaan (untuk JKK)
- Status PTKP per karyawan (K/0, K/1, TK/0, dll.)

---

## 7. KPI → Bonus Flow

**Keputusan:** Tidak otomatis — HR Admin yang men-trigger kalkulasi

```
HR Admin konfigurasi formula bonus
          ↓
KPI period selesai → score KPI tercatat dan diapprove
          ↓
HR Admin trigger "Hitung Bonus" untuk periode tertentu
          ↓
Sistem: formula + KPI score + gaji pokok → generate angka bonus
          ↓
HR Admin review & approve hasil kalkulasi
          ↓
Angka bonus masuk ke komponen payroll periode berikutnya
```

**Formula disimpan per:** perusahaan, divisi, atau jabatan (HR Admin yang menentukan granularitasnya).

---

## 8. Licensing & Billing Architecture

**Model:** Per user aktif / bulan × modul yang diaktifkan

**Aturan:**
- Modul 1 wajib untuk semua tenant
- Modul 2 dapat diaktifkan tanpa Modul 3
- Modul 3 membutuhkan Modul 2 aktif

**Tabel yang diperlukan:**
- `tenant_modules`: modul apa yang aktif per tenant
- `tenant_user_count`: snapshot jumlah user aktif per bulan untuk billing
- Integrasi payment gateway untuk subscription management

---

## 9. Deployment & Infrastructure

**Keputusan:** VPS self-hosted di Vultr Jakarta

**Alasan:**
- Tidak ada serverless timeout — payroll batch calculation bisa berjalan selama yang dibutuhkan
- Background jobs (BullMQ + Redis) berjalan native di container tanpa external service
- Data center Jakarta — compliance UU PDP (UU No. 27/2022) untuk data pribadi karyawan WNI
- Cost predictable: flat monthly vs pay-per-invocation
- Full control untuk security hardening

**Stack infrastruktur:**
- **OS:** Ubuntu 24.04 LTS
- **Containerisasi:** Docker + Docker Compose
- **Orchestration & Deploy:** Coolify (self-hosted, zero-downtime deploy via GitHub webhook)
- **Reverse Proxy:** Nginx + Let's Encrypt (SSL auto-renew via Coolify)
- **Database:** PostgreSQL 17 (Docker, di VPS yang sama — upgrade ke VPS terpisah saat scale)
- **Queue:** Redis (Docker, di VPS yang sama)
- **File Storage:** Google Cloud Storage (tetap GCS via HTTP API)
- **CI/CD:** GitHub Actions → build image → Coolify deploy

**Security baseline:** SSH key only, UFW firewall (port 22/80/443), Fail2ban, non-root containers, Docker network isolation, daily backup PostgreSQL ke GCS.

Lihat detail lengkap di [TECH_STACK.md](./TECH_STACK.md).

---

## 10. Authentication Strategy

**Keputusan:** Auth.js v5 (`next-auth@5`) self-hosted

**Alternatif yang dievaluasi:**

| | Auth.js v5 | Clerk |
|---|---|---|
| Data lokasi | VPS Jakarta (kita kontrol) | Server US (Clerk) |
| UU PDP compliance | ✅ Sepenuhnya compliant | ⚠️ Risiko — data PII di luar Indonesia |
| Harga | Gratis | $0–$200+/bulan tergantung MAU |
| Multi-tenant | Manual (kita build, sudah direncanakan di Fase 0) | Built-in via Organizations |
| RBAC | Manual (custom sesuai kebutuhan HRIS) | Built-in (tapi tetap perlu custom mapping) |
| Vendor lock-in | Tidak ada | Tinggi — migrasi sangat painful |

**Alasan memilih Auth.js v5:**
- Data identitas karyawan (nama, email, session) tersimpan di PostgreSQL kita di Jakarta — UU PDP compliant
- Tidak ada biaya tambahan seiring jumlah user/tenant bertambah
- Full control untuk kebutuhan HRIS: tenant context di session, audit trail setiap login, session invalidasi saat karyawan resign
- Tidak ada vendor dependency

**Package yang digunakan:**
- `next-auth@^5.0.0` — core Auth.js v5
- `@auth/drizzle-adapter` — adapter untuk PostgreSQL via Drizzle ORM

**Perbedaan utama Auth.js v5 vs NextAuth v4:**
- API baru: `auth()` menggantikan `getServerSession()`
- Config terpusat di `auth.ts` (satu file, bukan `pages/api/auth/[...nextauth].ts`)
- Native support untuk Next.js App Router & Server Components
- `middleware.ts` menggunakan `auth` secara langsung
