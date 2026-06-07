# Aranya HRIS

Platform Human Resource Information System (HRIS) berbasis SaaS untuk pasar Indonesia. Mendukung multi-tenant, dapat diakses via browser desktop dan mobile (PWA).

---

## Modul

| # | Modul | Tier | Fitur Utama |
|---|-------|------|-------------|
| 1 | Core HR & Employee Self-Service | Wajib | Master data, org chart, absensi GPS, shift, cuti, overtime, slip gaji |
| 2 | HR Operations & Performance Development | Add-on | KPI, bonus, training, aset, onboarding/offboarding, disiplin, analytics, integrasi |
| 3 | Payroll & Compliance | Add-on | Payroll (PPh 21 TER, BPJS), overtime pay, klaim, slip gaji otomatis |

Billing: **per user aktif / bulan × modul yang diaktifkan**. Modul 2 & 3 add-on **independen** (cukup butuh Modul 1).

Detail: [docs/MODULES.md](docs/MODULES.md)

---

## Tech Stack

| Kategori | Teknologi |
|----------|-----------|
| Framework | Next.js 16 (App Router) + TypeScript |
| Database | PostgreSQL 17 + Drizzle ORM |
| Auth | Auth.js v5 — self-hosted, UU PDP compliant |
| UI | Tailwind CSS v4 + shadcn/ui |
| Background Jobs | BullMQ + Redis |
| File Storage | Google Cloud Storage |
| PDF | @react-pdf/renderer |
| PWA | Serwist + Workbox (wiring di Fase 1) |
| Payments | Stripe |
| Testing | Vitest + Playwright |

## Infrastructure

| Item | Pilihan |
|------|---------|
| VPS | Vultr Jakarta (data residency Indonesia — UU PDP) |
| Container | Docker + Docker Compose |
| Deployment | Coolify + GitHub Actions |
| Proxy | Nginx + Let's Encrypt |
| Monitoring | Sentry + Uptime Kuma |

---

## Platform Core

Tersedia di semua modul: RBAC, notifikasi (in-app + email), audit trail, konfigurasi tenant, approval workflow, manajemen rate PPh 21 & BPJS.

---

## Dokumentasi

- [Product Requirements Document](docs/PRD.md)
- [Struktur Modul & Lisensi](docs/MODULES.md)
- [Architecture Decisions](docs/ARCHITECTURE.md)
- [Tech Stack](docs/TECH_STACK.md)
- [Development Roadmap](docs/ROADMAP.md)
- [Database Schema](docs/DATABASE_SCHEMA.md)
- [Folder Structure](docs/FOLDER_STRUCTURE.md)
- [Security Architecture](docs/SECURITY.md)

---

## Regulasi Indonesia

- PPh 21 (tarif progresif, PTKP) — dikelola Super Admin
- BPJS Kesehatan
- BPJS Ketenagakerjaan (JKK, JKM, JHT, JP)
- Perhitungan lembur sesuai UU Ketenagakerjaan
- Data residency sesuai UU PDP No. 27/2022
