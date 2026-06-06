# Aranya HRIS — Tech Stack

**Versi:** 1.1.0  
**Tanggal:** 2026-06-06  
**Status:** Final

---

## Stack Overview

| Kategori | Teknologi | Alasan |
|----------|-----------|--------|
| **Framework** | Next.js 16 (App Router) | Full-stack, PWA support, TypeScript native |
| **Language** | TypeScript | Type safety — krusial untuk payroll & BPJS calculation |
| **Database** | PostgreSQL 17 | RLS support, complex queries payroll |
| **ORM** | Drizzle ORM | Native SQL support, optimal untuk RLS & window functions payroll |
| **Auth** | Auth.js v5 (next-auth@5) | Self-hosted, UU PDP compliant, multi-tenant RBAC |
| **UI Framework** | Tailwind CSS v4 + shadcn/ui | Dashboard components: data table, form, dialog |
| **State — Server** | TanStack Query | Caching, invalidation, optimistic updates |
| **State — Client** | Zustand | Lightweight global state |
| **Background Jobs** | BullMQ + Redis | Payroll calculation, PDF batch, email batch |
| **Email** | Resend + React Email | Transactional email, notification fallback |
| **File Storage** | Google Cloud Storage | Dokumen, slip gaji, bukti klaim |
| **PDF** | @react-pdf/renderer | Generate slip gaji otomatis |
| **Geo/Maps** | Leaflet.js + Haversine formula | Visualisasi geofencing + validasi server |
| **PWA** | @ducanh2912/next-pwa + Workbox | Offline absensi, installable mobile — fork aktif dari next-pwa |
| **Payments** | Stripe | Subscription SaaS billing |
| **Testing** | Vitest + Testing Library + Playwright | Unit, integration, E2E |
| **Monitoring** | Sentry + Uptime Kuma | Error tracking + uptime self-hosted |

---

## Infrastructure

### VPS

| Item | Pilihan |
|------|---------|
| **Provider** | Vultr Jakarta (ID) |
| **Alasan** | Data center Indonesia — compliance UU PDP (UU No. 27/2022) |
| **Spec awal** | 4 vCPU, 8 GB RAM, 160 GB NVMe |
| **OS** | Ubuntu 24.04 LTS |

### Arsitektur Container

```
VPS — Ubuntu 24.04 LTS (Vultr Jakarta)
│
├── Coolify (deployment & orchestration)
│
├── Nginx (reverse proxy + SSL Let's Encrypt)
│
└── Docker Compose
    ├── aranya-app       (Next.js — port 3000, internal only)
    ├── aranya-worker    (BullMQ workers: payroll, PDF, email)
    ├── postgres         (PostgreSQL 17)
    ├── redis            (BullMQ queue + session cache)
    └── pgbouncer        (connection pooling — opsional, aktifkan jika > 50 tenant)
```

### File Storage

- **Provider:** Google Cloud Storage (GCS)
- **Akses:** Private bucket — semua akses via signed URL (TTL 15 menit)
- **Struktur path:**

```
aranya-storage/
├── payslips/{tenant_id}/{year}/{month}/{employee_id}.pdf
├── documents/{tenant_id}/{employee_id}/{doc_type}/{filename}
├── claims/{tenant_id}/{claim_id}/{filename}
└── assets/{tenant_id}/{asset_id}/{filename}
```

---

## CI/CD Pipeline

```
Developer push ke GitHub
        ↓
GitHub Actions
├── Run tests (Vitest + Playwright)
├── Build Docker image
└── Push ke Docker Hub / GitHub Container Registry
        ↓
Coolify (webhook trigger)
└── Pull image → zero-downtime deploy → health check
```

---

## Security Baseline VPS

```
[ ] SSH key only — password login disabled
[ ] UFW firewall — hanya port 22, 80, 443 terbuka
[ ] Fail2ban — blokir brute force SSH
[ ] Non-root user untuk semua service
[ ] Docker network isolation — PostgreSQL & Redis tidak expose ke publik
[ ] SSL/TLS via Let's Encrypt (auto-renew via Coolify)
[ ] Automated PostgreSQL backup ke GCS (daily, retain 30 hari)
[ ] Unattended-upgrades untuk security patches
[ ] Sentry untuk error monitoring
[ ] Uptime Kuma untuk availability monitoring
```

---

## Database Strategy

| Item | Keputusan |
|------|-----------|
| **Lokasi** | Di VPS yang sama (simplicity fase awal) |
| **Isolasi tenant** | Shared DB + `tenant_id` + PostgreSQL RLS |
| **Connection pooling** | PgBouncer (aktifkan saat > 50 tenant aktif) |
| **Backup** | Daily dump ke GCS, retain 30 hari |
| **Migrasi skema** | Drizzle Kit (`drizzle-kit push` / `migrate`) |

**Upgrade path:** Jika trafik meningkat signifikan, PostgreSQL dapat dipindah ke VPS terpisah tanpa perubahan application code.

---

## Alasan Tidak Menggunakan

| Teknologi | Alasan Tidak Dipilih |
|-----------|---------------------|
| Vercel | Function timeout 60 detik — tidak cukup untuk payroll batch calculation |
| GCP Cloud Run | Sudah digantikan VPS yang lebih cost-effective dan terkontrol |
| Prisma | Terbatas untuk complex SQL (window functions, CTEs) yang dibutuhkan payroll |
| TailGrids | Marketing UI — tidak cocok untuk admin dashboard HRIS |
| Inngest | Tidak diperlukan karena tidak pakai serverless — BullMQ lebih powerful di VPS |
| Supabase | GCS sudah dipilih untuk storage; database di VPS lebih hemat dan terkontrol |
| NextAuth v4 | Vulnerabilities di semua 4.x, tidak ada path fix — digantikan Auth.js v5 |
| Clerk | Data user disimpan di server US — melanggar UU PDP; biaya naik seiring MAU bertambah |
| next-pwa | Tidak lagi dirawat, vulnerabilities di serialize-javascript — digantikan @ducanh2912/next-pwa |
