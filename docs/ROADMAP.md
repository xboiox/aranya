# Aranya HRIS — Development Roadmap

**Versi:** 1.1.0  
**Tanggal:** 2026-06-06

---

## Fase -1 — Infrastructure Setup ✅

> Semua konfigurasi & script selesai dibuat pada 2026-06-06.
> Item bertanda 🔧 memerlukan tindakan manual di VPS/console.

- [x] Dockerfile (multi-stage) + .dockerignore
- [x] docker-compose.yml (production) + docker-compose.dev.yml
- [x] docker/nginx/default.conf (reverse proxy + security headers)
- [x] scripts/setup-vps.sh (Ubuntu hardening + Docker install)
- [x] scripts/backup-db.sh (PostgreSQL daily backup ke GCS)
- [x] .github/workflows/deploy.yml (CI/CD: test → build → Coolify deploy)
- [x] .env.example (semua environment variables)
- [x] package.json (Aranya stack: Drizzle, BullMQ, Resend, dll.)
- [x] next.config.js (PWA, standalone, security headers)
- [ ] 🔧 Provisioning VPS Vultr Jakarta (4 vCPU, 8 GB RAM)
- [ ] 🔧 Jalankan `scripts/setup-vps.sh` di VPS
- [ ] 🔧 Install & konfigurasi Coolify
- [ ] 🔧 Setup domain + DNS pointing ke VPS
- [ ] 🔧 Buat GCS bucket `aranya-storage` + service account key
- [ ] 🔧 Setup Sentry project (error monitoring)
- [ ] 🔧 Set GitHub Secrets: `COOLIFY_WEBHOOK_URL`, `COOLIFY_TOKEN`
- [ ] 🔧 Setup cron backup DB ke GCS (daily jam 02:00)

---

## Local Development Setup

Urutan perintah yang benar untuk setup local dev pertama kali:

```bash
# 1. Pastikan Docker Desktop sudah berjalan

# 2. Jalankan PostgreSQL + Redis via Docker (local dev only)
docker compose -f docker-compose.dev.yml up -d

# 3. Copy .env.example → .env, lalu isi minimal:
#    DATABASE_URL=postgresql://aranya_app:aranya_app_secret@127.0.0.1:5432/aranya_dev   (app role, RLS)
#    ADMIN_DATABASE_URL=postgresql://aranya:aranya_dev_secret@127.0.0.1:5432/aranya_dev (superuser)
#    AUTH_SECRET=<random 32 char>           (generate: openssl rand -base64 32)
#    AUTH_ENCRYPTION_KEY=<64 char hex>      (generate: openssl rand -hex 32)
#    AUTH_URL=http://localhost:3000
#    SUPER_ADMIN_EMAIL=<email asli Anda>    (dipakai db:seed)
#    SUPER_ADMIN_PASSWORD=<password kuat>   (dipakai db:seed)

# 4. Generate Drizzle migration files
npm run db:generate

# 5. Jalankan migration (buat semua tabel) — pakai ADMIN_DATABASE_URL
npm run db:migrate

# 6. Buat app role non-superuser (parse dari DATABASE_URL) — agar RLS dienforce
npm run db:setup-role

# 7. Apply RLS + FORCE policies (via ADMIN, tidak butuh psql lokal)
npm run db:rls

# 8. Seed: roles, permissions, Super Admin user (via ADMIN)
npm run db:seed

# 9. Jalankan app
npm run dev
```

> **Kenapa dua URL?** PostgreSQL superuser/owner otomatis bypass RLS. App HARUS konek
> sebagai role non-superuser (`aranya_app`) agar isolasi tenant dienforce. Operasi admin
> (migrasi/seed/RLS) pakai superuser. Detail: [SECURITY.md](./SECURITY.md).

### Catatan Penting `DATABASE_URL`

Semua perintah `db:*` membaca `DATABASE_URL` dari `.env`. Format yang benar:
`postgresql://user:password@127.0.0.1:5432/database`

- **Gunakan `127.0.0.1`, BUKAN `localhost`.** Di macOS, `localhost` resolve ke IPv6 (`::1`)
  lebih dulu. Jika ada PostgreSQL lokal (Postgres.app/Homebrew) yang listen di `[::1]:5432`,
  koneksi akan nyasar ke sana — bukan ke container Docker — dan muncul error
  `role "aranya" does not exist`. `127.0.0.1` memaksa IPv4 → langsung ke Docker.
- Nama database untuk dev adalah **`aranya_dev`** (sesuai `docker-compose.dev.yml`), bukan `aranya`.
- Jika password mengandung karakter spesial (`@`, `&`, `(`, `#`, `%`), harus di-URL-encode.
  Untuk dev, gunakan password sederhana `aranya_dev_secret`.

### Cek apa yang listen di port 5432 (jika koneksi bermasalah)

```bash
lsof -nP -iTCP:5432 -sTCP:LISTEN
# Jika ada 2 baris (Docker + postgres lokal), pakai 127.0.0.1 di DATABASE_URL.
```

---

## Fase 0 — Foundation (Platform Core)

> Schema, folder structure, dan skeleton sudah dibuat pada 2026-06-06.
> Item berikut adalah implementasi penuh yang perlu diselesaikan.

**Database & Infrastruktur:**
- [x] Drizzle schema: auth, tenants, rbac, employees, audit, notifications, invitations, tax-rates
- [x] PostgreSQL RLS policies + **FORCE RLS** (`src/lib/db/rls.sql`) — **terverifikasi enforced**
- [x] App role non-superuser (`npm run db:setup-role`) — RLS dienforce untuk app runtime
- [x] `withTenantContext()` + `withSuperAdminContext()` helpers (bootstrap queries pakai bypass)
- [x] DB seed script (`npm run db:seed`): roles, permissions, role-permissions, Super Admin user

**Auth (Auth.js v5):**
- [x] Auth.js v5 config + DrizzleAdapter + `unstable_update` export + trigger handling
- [x] Middleware/proxy guard + 2FA redirect (`startsWith`)
- [x] Session timeout per role (super_admin=2h, hr_admin=4h, manager/employee=8h)
- [x] Login page + Zod validation + Server Action (`useActionState`)
- [x] Password reset: forgot-password + reset-password pages + actions + email
- [x] 2FA setup: QR code, TOTP verify, backup codes (8 kode single-use, bcrypt-hashed)
- [x] **2FA secret dienkripsi at rest (AES-256-GCM)**
- [x] 2FA verify: token + backup code fallback
- [x] **Reset 2FA** oleh HR Admin/Super Admin (`/dashboard/security`) — anti-lockout
- [x] Invitation accept: validate token → register → employee + role → auto sign-in
- [x] **Rate limiting** auth (login 5/mnt, forgot-password 3/mnt, 2FA verify 5/mnt — Redis, fail-open)
- [x] **Env var validation at startup** (`src/lib/env.ts`, Zod, fail-fast)

**Tenant Management (Super Admin):**
- [x] Tenant list page (`/tenants`)
- [x] Create tenant form + activate modules + send invite HR Admin (`/tenants/new`)
- [x] Detail tenant: resend invitation, deactivate/activate (enforced di dashboard), hapus permanen
  (cascade + cleanup user yatim + audit_logs, konfirmasi ketik-nama)
- [ ] Manage PPh 21 rates, PTKP values, BPJS rates (`/rates`)

**UI & Shell:**
- [x] shadcn/ui (Base UI / base-nova preset) + design tokens + Toaster (sonner)
- [x] Dashboard shell: sidebar role-aware + user menu + logout + role-based quick cards
- [x] Custom error / not-found / loading pages (branded)
- [x] Dev email fallback (log link ke console saat RESEND_API_KEY tidak diset)

**Platform Core:**
- [ ] Notification engine: in-app + email via Resend
- [x] Audit trail: helper `logAudit()` + wired ke login, password reset, invite, 2FA, create tenant, reset 2FA
- [ ] Audit trail: perluas ke semua mutasi data (employee, leave, payroll, dll. di fase berikut)
- [ ] GCS integration: upload, signed URL, delete (helper `src/lib/gcs.ts` siap)
- [x] PWA fondasi: Serwist + `src/app/sw.ts` (wiring build → Fase 1, lihat TECH_STACK.md)
- [x] Testing: unit (64) + **integration vs DB nyata** (RLS isolation + leave balance) + demo seed
  (`npm run test:integration`, `npm run db:seed:demo`) — lihat [TESTING.md](./TESTING.md)
- [ ] Billing: track user aktif per tenant per bulan

---

## Fase 1 — Modul 1: Core HR & Employee Self-Service

**Target:** Tenant bisa onboarding, kelola karyawan, dan absensi berjalan.

- [x] Employee Master Data: list + create (pre-create user + invite aktivasi) + detail/edit
  (`/dashboard/employees`, tenant-scoped via RLS, authz HR Admin, audit create/update)
- [x] Reporting Line (direct lead per karyawan) — `reportsToId`, validasi same-tenant + anti self-report
- [x] Invite flow mendukung aktivasi user yang sudah di-pre-create HR (set password saja)
- [ ] Organizational Structure & Org Chart (visualisasi hierarki)
- [x] Absensi GPS dengan geofencing configurable (check-in/out, validasi Haversine server-side,
  HR config titik + radius + toggle, `/dashboard/attendance` + `/settings`)
- [x] WFH mode pada absensi (skip validasi geofence, tercatat di record)
- [ ] Offline absensi + sync (finalisasi wiring PWA/Serwist — evaluasi Turbopack support)
- [x] Shift & jadwal kerja: HR definisikan shift (jam + toleransi), assign ke karyawan,
  deteksi terlambat otomatis saat check-in. `/dashboard/attendance/shifts` + assign di edit karyawan
  (roster per-tanggal = follow-up)
- [x] Leave Management + approval flow: ajukan cuti (5 jenis), saldo cuti tahunan
  (hari kerja Senin–Jumat **minus hari libur**), inbox approval (direct lead via reporting line /
  HR fallback), approve/reject + notifikasi, anti self-approve. `/dashboard/leave` + `/approvals`
- [x] Leave correctness: kecualikan hari libur, cegah tumpang tindih, cegah tanggal lampau,
  pembatalan (pending/approved belum mulai), UI kuota + manajemen hari libur (`/leave/settings`)
- [x] Overtime pencatatan + approval flow: ajukan lembur (jam mulai/selesai, durasi otomatis +
  lewat tengah malam), inbox approval (direct lead/HR), approve/reject + notifikasi, cancel,
  anti self-approve, cegah tanggal masa depan. `/dashboard/overtime` + `/approvals`
  (perhitungan bayaran lembur = Modul 3)
- [x] Slip gaji upload (HR) & download (karyawan): storage abstraction (GCS prod / FS lokal dev),
  download lewat route terotentikasi (cek kepemilikan / HR), validasi PDF + maks 5MB, notifikasi.
  `/dashboard/payslip` + `/manage` (generate otomatis dari payroll = Modul 3)

---

## Fase 2 — Modul 2: HR Operations & Performance Development

> Struktur modul ditukar pada 2026-06-07 (lihat [MODULES.md](./MODULES.md)).
> Modul 2 kini = HR Ops & Performance (risiko rendah, dikerjakan dulu).
> Add-on independen — cukup butuh Modul 1.

**Target:** Lengkapi manajemen kinerja, pengembangan, dan operasi HR.

- [x] Training & Development: catat pelatihan & sertifikasi per karyawan, tracking masa berlaku
  (badge kedaluwarsa/segera berakhir), HR kelola, karyawan lihat. `/dashboard/training` + `/manage`
  (ter-gate MODULE_2)
- [x] Asset Management: catat aset perusahaan (laptop/HP/kendaraan/kartu/lainnya), pinjamkan/
  kembalikan ke karyawan, hapus; karyawan lihat aset yang dipinjam. `/dashboard/assets` + `/manage`
  (ter-gate MODULE_2; integrasi offboarding = follow-up)
- [x] KPI / Performance Management — siklus penuh 3 fase (lihat `docs/KPI_DESIGN.md`):
  - **Fase A** Perencanaan: HR atur periode + target perusahaan; manajer susun KPI berbobot
    (total 100%) untuk bawahan; karyawan setujui / minta revisi; guard aktivasi.
  - **Fase B** Eksekusi: karyawan update progres + unggah bukti; manajer monitoring + feedback;
    completion rate.
  - **Fase C** Penilaian: self-assessment + nilai manajer (1–5); HR lock + kalibrasi; skor akhir
    tertimbang Σ(bobot×final). `/dashboard/kpi` (karyawan) + `/kpi/team` (manajer) + `/kpi/periods` (HR)
  - (ter-gate MODULE_2; v2: cascade formal, template, reminder otomatis, laporan PDF)
- [x] Onboarding/Offboarding checklist: HR kelola tugas per karyawan (tambah/centang/hapus +
  template standar), karyawan lihat progres. `/dashboard/onboarding` + `/manage` (ter-gate MODULE_2;
  auto-link ke serah terima aset = follow-up)
- [x] HR Analytics Dashboard: headcount aktif/nonaktif, hadir & cuti hari ini, antrian persetujuan
  (cuti+lembur), karyawan baru bln ini, rata-rata skor KPI (periode terkunci); breakdown per
  departemen/kontrak/gender. `/dashboard/analytics` (HR-only, ter-gate MODULE_2)
- [ ] Bonus: konfigurasi formula, trigger kalkulasi, approval HR (memakai KPI score)
- [ ] Discipline & Warning (SP1/2/3)
- [ ] API publik & webhook untuk integrasi pihak ketiga
- [ ] Konektor ATS (sinkronisasi karyawan baru)

---

## Fase 3 — Modul 3: Payroll & Compliance

> **Risiko tertinggi** (uang, pajak, regulasi). Dikerjakan paling akhir dengan design doc +
> spesifikasi pajak yang benar (PPh 21 TER) + pengujian habis-habisan. Add-on independen.

**Target:** Penggajian end-to-end dengan PPh 21 (TER) dan BPJS.

- [ ] Rate management UI + seed (TER/PTKP/BPJS, dikelola Super Admin) — prasyarat
- [ ] Field gaji & PTKP di form karyawan — prasyarat
- [ ] Design doc data model payroll (payroll_run, payroll_item)
- [ ] Overtime perhitungan bayaran → integrasi payroll
- [ ] Claim management (medical + reimbursement) + approval
- [ ] Payroll calculator: gaji pokok + tunjangan + lembur + bonus + klaim
- [ ] Perhitungan PPh 21 metode TER + rekonsiliasi progresif akhir tahun
- [ ] Perhitungan BPJS Kesehatan & Ketenagakerjaan
- [ ] Generate slip gaji PDF otomatis

---

## Lintas-fase / Platform (backlog)

- [ ] **Internationalization (i18n)** — toggle dwibahasa **EN + ID**, **default English**;
  cakupan UI + server actions + validasi + **notifikasi & email**. Framework `next-intl`
  (locale via cookie + kolom `users.locale`). **Dikerjakan nanti** sebagai track tersendiri
  (jangan interleave dgn smoke-test). Rencana bertahap: lihat [I18N_DESIGN.md](./I18N_DESIGN.md)

---

## Catatan

- Setiap fase diselesaikan sebelum memulai fase berikutnya
- Test coverage minimal 80% wajib di setiap fase (Vitest + Playwright)
- Tech stack: **final** — lihat [TECH_STACK.md](./TECH_STACK.md)
- Infrastruktur: **final** — Vultr Jakarta, Docker, Coolify, GCS
- Database schema: **final (core)** — lihat [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
- Folder structure: **final** — lihat [FOLDER_STRUCTURE.md](./FOLDER_STRUCTURE.md)
