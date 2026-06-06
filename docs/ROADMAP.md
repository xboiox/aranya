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
- [ ] Edit / deactivate tenant
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
- [x] Testing: Vitest setup + tests crypto/totp/rbac (19 pass); CI lint+typecheck+test
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
- [ ] Shift & jadwal kerja
- [ ] Leave Management + approval flow
- [ ] Overtime pencatatan + approval flow
- [ ] Slip gaji upload & download

---

## Fase 2 — Modul 2: Payroll & Performance Management

**Target:** Penggajian end-to-end berjalan lengkap dengan PPh 21 dan BPJS.

- [ ] Overtime perhitungan bayaran → integrasi payroll
- [ ] Claim management (medical + reimbursement) + approval
- [ ] KPI management: input, approval, score history
- [ ] Bonus: konfigurasi formula, trigger kalkulasi, approval HR
- [ ] Payroll calculator: gaji pokok + tunjangan + lembur + bonus + klaim
- [ ] Perhitungan PPh 21 otomatis
- [ ] Perhitungan BPJS Kesehatan & Ketenagakerjaan
- [ ] Generate slip gaji PDF otomatis
- [ ] Discipline & Warning (SP1/2/3)

---

## Fase 3 — Modul 3: HR Operations & Development

**Target:** Lengkapi siklus HR dari onboarding sampai offboarding dan analytics.

- [ ] Training & Development: rencana, tracking sertifikasi
- [ ] Asset Management: pencatatan, linked ke karyawan
- [ ] Onboarding checklist
- [ ] Offboarding checklist (termasuk serah terima aset)
- [ ] HR Analytics Dashboard
- [ ] API publik & webhook untuk integrasi pihak ketiga
- [ ] Konektor ATS (sinkronisasi karyawan baru)

---

## Catatan

- Setiap fase diselesaikan sebelum memulai fase berikutnya
- Test coverage minimal 80% wajib di setiap fase (Vitest + Playwright)
- Tech stack: **final** — lihat [TECH_STACK.md](./TECH_STACK.md)
- Infrastruktur: **final** — Vultr Jakarta, Docker, Coolify, GCS
- Database schema: **final (core)** — lihat [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
- Folder structure: **final** — lihat [FOLDER_STRUCTURE.md](./FOLDER_STRUCTURE.md)
