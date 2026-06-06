# Aranya HRIS — Project Structure

**Versi:** 1.0.0  
**Tanggal:** 2026-06-06

---

## Root Directory

```
aranya/
├── src/                        ← Application code
├── docs/                       ← Documentation
├── docker/nginx/               ← Nginx config
├── scripts/                    ← VPS & backup scripts
├── drizzle/                    ← Auto-generated migrations (drizzle-kit)
├── public/                     ← Static assets + PWA manifest
├── .github/workflows/          ← CI/CD
├── Dockerfile                  ← Next.js app (multi-stage)
├── Dockerfile.worker           ← BullMQ worker
├── docker-compose.yml          ← Production
├── docker-compose.dev.yml      ← Development (postgres + redis only)
├── drizzle.config.ts           ← Drizzle Kit config
├── vitest.config.ts            ← Vitest config
├── next.config.js              ← Next.js config (PWA + security headers)
└── .env.example                ← Environment variables template
```

---

## src/ Structure

```
src/
├── app/                        ← Next.js App Router
│   ├── (auth)/                 ← Auth pages (no dashboard layout)
│   │   ├── layout.tsx          ← Centered card layout
│   │   ├── login/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx
│   │   ├── 2fa/page.tsx        ← TOTP verification
│   │   └── invite/[token]/page.tsx  ← Accept invitation
│   │
│   ├── (dashboard)/            ← Main app (requires auth)
│   │   ├── layout.tsx          ← Sidebar + header
│   │   ├── page.tsx            ← Dashboard home
│   │   │
│   │   ├── ── Modul 1 ──────────────────────────────
│   │   ├── attendance/         ← Absensi + GPS
│   │   ├── leave/              ← Cuti
│   │   ├── overtime/           ← Lembur
│   │   ├── payslip/            ← Slip gaji (download)
│   │   ├── employees/          ← Master data karyawan
│   │   ├── organization/       ← Org chart + reporting line
│   │   │
│   │   ├── ── Modul 2 (add-on) ─────────────────────
│   │   ├── payroll/            ← Payroll calculator
│   │   ├── kpi/                ← KPI management
│   │   ├── claims/             ← Medical + reimbursement
│   │   ├── bonus/              ← Bonus calculation
│   │   ├── discipline/         ← SP1/SP2/SP3
│   │   │
│   │   └── ── Modul 3 (add-on) ─────────────────────
│   │       ├── training/
│   │       ├── assets/
│   │       ├── onboarding/
│   │       └── analytics/
│   │
│   ├── (super-admin)/          ← Super Admin area
│   │   ├── layout.tsx          ← Guard: role = super_admin
│   │   ├── tenants/            ← Kelola tenant
│   │   └── rates/              ← PPh 21, BPJS rates
│   │
│   ├── api/
│   │   └── auth/[...nextauth]/ ← Auth.js v5 handler
│   │
│   ├── layout.tsx              ← Root layout
│   ├── page.tsx                ← Redirect ke /dashboard atau /login
│   └── globals.css             ← Tailwind v4 imports
│
├── components/
│   ├── ui/                     ← shadcn/ui components
│   ├── layout/                 ← Sidebar, Header, PageHeader
│   └── shared/                 ← Reusable business components
│
├── modules/                    ← Business logic per feature
│   ├── attendance/
│   │   ├── components/         ← Feature-specific UI
│   │   ├── hooks/              ← React hooks
│   │   ├── actions.ts          ← Server Actions
│   │   └── queries.ts          ← DB queries via Drizzle
│   ├── leave/
│   ├── payroll/
│   └── employees/
│
├── lib/
│   ├── auth.ts                 ← Auth.js v5 config + helpers
│   ├── db/
│   │   ├── index.ts            ← Drizzle client + withTenantContext()
│   │   ├── schema/             ← Table definitions (see DATABASE_SCHEMA.md)
│   │   └── rls.sql             ← PostgreSQL RLS policies
│   ├── gcs.ts                  ← Google Cloud Storage client
│   ├── redis.ts                ← Redis / BullMQ connection
│   └── utils/
│       ├── payroll.ts          ← PPh 21, BPJS calculation helpers
│       └── geo.ts              ← Haversine formula (geofencing)
│
├── workers/
│   ├── index.ts                ← Worker entry point (npm run worker)
│   ├── payroll.worker.ts       ← Payroll batch calculation (Fase 2)
│   ├── pdf.worker.ts           ← Slip gaji PDF generation (Fase 2)
│   └── email.worker.ts         ← Email notifications (Fase 0)
│
├── middleware.ts               ← Auth guard + 2FA redirect
└── test/
    └── setup.ts                ← Vitest + Testing Library setup
```

---

## Konvensi

| Lokasi | Isi |
|--------|-----|
| `src/app/(dashboard)/[feature]/page.tsx` | Page component (RSC, fetch data server-side) |
| `src/modules/[feature]/actions.ts` | Server Actions (`"use server"`) |
| `src/modules/[feature]/queries.ts` | Drizzle queries (dipanggil dari actions atau RSC) |
| `src/modules/[feature]/components/` | Client components (`"use client"`) untuk feature |
| `src/components/ui/` | shadcn/ui components — tidak dimodifikasi manual |
| `src/components/shared/` | Shared business components (DataTable, ApprovalBadge, dll.) |

---

## Module Guard

Halaman Modul 2 dan 3 perlu cek apakah tenant sudah aktifkan modul tersebut:

```typescript
// Di layout.tsx atau page.tsx modul 2/3
const isModuleActive = await checkTenantModule(tenantId, "MODULE_2")
if (!isModuleActive) notFound()
```
