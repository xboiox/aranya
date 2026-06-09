# Aranya HRIS — Testing Strategy

**Versi:** 1.0.0  
**Tanggal:** 2026-06-07

Dua tier test + demo seed untuk menutup blind spot verifikasi (bug yang lolos ke
pengguna karena alur tidak benar-benar dijalankan).

> Untuk **checklist QA manual klik-per-klik** (alur UI yang tidak ditangkap test
> otomatis), lihat [MANUAL_TESTING.md](./MANUAL_TESTING.md).

---

## Tier 1 — Unit Tests (cepat, tanpa DB)

`npm run test` — Vitest (jsdom). Menguji **fungsi murni & schema validation**:

| Area | File |
|------|------|
| Crypto AES-256-GCM | `src/lib/utils/crypto.test.ts` |
| TOTP | `src/lib/utils/totp.test.ts` |
| RBAC helpers | `src/lib/rbac.test.ts` |
| Geo / geofence decision | `src/lib/geo.test.ts`, `src/modules/attendance/geofence.test.ts` |
| Date (hari kerja, overlap) | `src/lib/date.test.ts` |
| Form schemas (zod) | `*/schema.test.ts` (employee, leave, tenant) |

**Penting:** schema test mencakup edge case yang menggigit di produksi — mis. checkbox
`null` (regresi bug "Expected string, received null" saat buat tenant).

Mengecualikan `*.integration.test.ts`.

---

## Tier 2 — Integration Tests (DB nyata)

`npm run test:integration` — Vitest (node) terhadap **database dev sungguhan**
(butuh Docker postgres aktif + `.env`). Menguji properti yang hanya muncul di DB:

| Properti | File |
|----------|------|
| **RLS tenant isolation** (security core): tenant context terisolasi, tanpa context terblokir, bypass lihat semua, tulis lintas-tenant ditolak (WITH CHECK) | `src/test/integration/rls.integration.test.ts` |
| **RLS isolasi tabel Modul 2**: `assets`, `kpi_evaluations`, `onboarding_tasks` — baca terisolasi, tanpa context kosong, bypass lihat semua, tulis lintas-tenant ditolak | `src/test/integration/module2-rls.integration.test.ts` |
| **Leave balance**: hanya cuti tahunan approved yang mengurangi kuota; terisolasi per tenant | `src/test/integration/leave.integration.test.ts` |

- Tiap test membuat data **ephemeral** (tenant/karyawan dengan id acak) lalu **cleanup**
  di `afterAll` — tidak mengotori data Anda.
- Konek lewat `@/lib/db` (app role `aranya_app`, RLS dienforce) + bypass untuk setup/teardown.
- Helper: `src/test/integration/helpers.ts`.

---

## Demo Seed

`npm run db:seed:demo` — membuat **PT Demo Aranya** (semua modul aktif) agar alur bisa
langsung dites tanpa setup manual:

| Akun | Email | Catatan |
|------|-------|---------|
| HR Admin | `hr@demo.aranya` | wajib setup 2FA saat login |
| Manager | `manager@demo.aranya` | bisa approve cuti bawahan |
| Karyawan | `budi@demo.aranya`, `siti@demo.aranya` | melapor ke manager |

Password semua: `Demo1234!`. Idempotent (skip jika `demo-aranya` sudah ada).

---

## Yang Masih Terbuka (jujur)

- **E2E browser** (Playwright) terkonfigurasi tapi belum ada test — alur UI penuh
  (login → 2FA → submit form) belum diuji otomatis.
- **CI**: workflow menjalankan unit test; integration test belum di-wire ke CI
  (butuh provision DB + migrate + setup-role + rls di pipeline).
