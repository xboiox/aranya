# Aranya HRIS — Development Roadmap

**Versi:** 1.0.0  
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

## Fase 0 — Foundation (Platform Core)

Sebelum implementasi modul apapun, fondasi berikut harus selesai:

- [ ] Setup multi-tenant: tabel `tenants`, `tenant_id` di semua tabel, PostgreSQL RLS
- [ ] RBAC: roles (Super Admin, HR Admin, Manager, Employee), permission matrix
- [ ] Authentication: login, session management, per-tenant routing
- [ ] Tenant configuration: jam kerja, hari libur, BPJS kategori
- [ ] Rate management: tabel PPh 21 dan BPJS dikelola Super Admin
- [ ] Notification engine: in-app + email fallback
- [ ] Audit trail: log perubahan data sensitif
- [ ] File storage: GCS integration, signed URL generator
- [ ] PWA setup: manifest, service worker, offline support dasar
- [ ] Billing: tracking user aktif per tenant, module activation

---

## Fase 1 — Modul 1: Core HR & Employee Self-Service

**Target:** Tenant bisa onboarding, kelola karyawan, dan absensi berjalan.

- [ ] Employee Master Data (CRUD lengkap)
- [ ] Organizational Structure & Org Chart
- [ ] Reporting Line (direct lead per karyawan)
- [ ] Absensi GPS dengan geofencing configurable
- [ ] WFH mode pada absensi
- [ ] Offline absensi + sync
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
