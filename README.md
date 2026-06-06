# Aranya HRIS

Platform Human Resource Information System (HRIS) berbasis SaaS untuk pasar Indonesia. Mendukung multi-tenant, dapat diakses via browser desktop dan mobile (PWA).

---

## Modul

| # | Modul | Tier | Fitur Utama |
|---|-------|------|-------------|
| 1 | Core HR & Employee Self-Service | Wajib | Master data, org structure, absensi GPS, cuti, overtime, slip gaji |
| 2 | Payroll & Performance Management | Add-on | Payroll, PPh 21, BPJS, KPI, bonus, klaim, disiplin |
| 3 | HR Operations & Development | Add-on | Training, aset, onboarding/offboarding, analytics, integrasi |

Billing: **per user aktif / bulan × modul yang diaktifkan**

---

## Tech Stack

| Kategori | Teknologi |
|----------|-----------|
| Framework | Next.js 16 (App Router) + TypeScript |
| Database | PostgreSQL 17 + Drizzle ORM |
| Auth | NextAuth v4 (multi-tenant RBAC) |
| UI | Tailwind CSS v4 + shadcn/ui |
| Background Jobs | BullMQ + Redis |
| File Storage | Google Cloud Storage |
| PDF | @react-pdf/renderer |
| PWA | next-pwa + Workbox |
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
- [Architecture Decisions](docs/ARCHITECTURE.md)
- [Tech Stack](docs/TECH_STACK.md)
- [Development Roadmap](docs/ROADMAP.md)

---

## Regulasi Indonesia

- PPh 21 (tarif progresif, PTKP) — dikelola Super Admin
- BPJS Kesehatan
- BPJS Ketenagakerjaan (JKK, JKM, JHT, JP)
- Perhitungan lembur sesuai UU Ketenagakerjaan
- Data residency sesuai UU PDP No. 27/2022
