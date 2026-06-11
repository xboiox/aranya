# Aranya HRIS — Desain Internationalization (i18n)

**Versi:** 0.1 (perencanaan)
**Tanggal:** 2026-06-10
**Status:** **PLANNED — belum dikerjakan.** Dikerjakan nanti (setelah smoke-test &
kemungkinan setelah Bonus). Dokumen ini menetapkan keputusan + rencana bertahap.

Tujuan: aplikasi **lebih global** dengan **toggle dwibahasa Inggris + Indonesia**.

---

## 1. Keputusan terkunci (disetujui user 2026-06-10)

| Topik | Keputusan |
|-------|-----------|
| Pendekatan | **Toggle EN + ID** (bukan ganti total ke Inggris) |
| Bahasa default | **English** (ID sebagai alternatif via toggle) |
| Cakupan v1 | **Termasuk** UI, server actions, validasi, **notifikasi, dan email** |
| Waktu | Dikerjakan **nanti** (track tersendiri, bukan saat smoke-test berjalan) |

> Konsekuensi default EN: setelah i18n live, pengguna melihat bahasa Inggris dulu;
> bisa beralih ke Indonesia lewat toggle. Checklist `MANUAL_TESTING.md` (kini berisi
> label Indonesia) perlu disesuaikan setelah i18n.

---

## 2. Kondisi saat ini

- **Belum ada library i18n.** Semua teks **hardcoded bahasa Indonesia**, tersebar di
  **~73 file** dari ~175.
- Teks UI berada di **5 lapisan**:
  1. Halaman & komponen (`.tsx`) — label, judul, tombol
  2. Server action — pesan `error` / `success`
  3. Validasi **Zod** — pesan error form
  4. **Notifikasi** — judul/isi yang **disimpan ke DB** saat dibuat (`notify()`)
  5. **Email** — undangan & notifikasi email

Lapisan 4 & 5 paling kompleks karena string **dipersisten / dikirim sekali**.

---

## 3. Arsitektur yang dipilih

### Framework
- **`next-intl`** — standar App Router (Next 16). Pakai mode **tanpa i18n routing**
  (locale via **cookie/header**) sehingga **tidak perlu** merestruktur `app/` menjadi
  `app/[locale]/...`.

### Resolusi & penyimpanan locale
- Tambah kolom **`users.locale`** (`'en' | 'id'`, default `'en'`).
- Prioritas resolusi: **preferensi user (DB)** → cookie `NEXT_LOCALE` → default `en`.
- Saat login / toggle: set cookie + (jika login) update `users.locale`.

### Toggle UI
- Komponen pemilih bahasa di **menu user** (dekat Sign out) dan/atau halaman
  **Keamanan/Pengaturan**. Mengubah → simpan preferensi → `router.refresh()`.

### Katalog pesan
```
src/i18n/
├── request.ts        getRequestConfig (resolusi locale)
├── routing.ts        daftar locale + default
messages/
├── en.json           sumber kebenaran (default)
└── id.json           terjemahan
```
- Kunci ber-namespace per area: `common.*`, `nav.*`, `auth.*`, `employees.*`,
  `kpi.*`, `leave.*`, dst. Pakai ICU untuk plural & interpolasi.

### Tanggal, angka, mata uang
- Format tanggal/angka jadi **locale-aware** (`en-US` vs `id-ID`) — saat ini hardcoded
  `id-ID`. **Mata uang tetap IDR** (hanya format yang mengikuti locale).

---

## 4. Strategi string tersimpan di DB (lapisan 4 & 5)

### Notifikasi (`notifications` + `notify()`)
- **Refactor `notify()`** agar menerima **kunci pesan + params** (bukan teks jadi).
- Skema: tambah kolom `title_key`, `body_key`, `params` (JSON). Pertahankan kolom
  `title`/`body` lama sebagai **fallback** untuk data historis.
- **Render saat ditampilkan** sesuai locale **pembaca** (halaman notifikasi + lonceng).
- Notifikasi lama (teks ID ter-render) tetap tampil apa adanya (fallback).

### Email
- Email dikirim **sekali** → tidak bisa di-render ulang. Maka **render saat kirim**
  memakai **locale penerima** (`users.locale` penerima).
- Template email disiapkan **dua bahasa** (EN + ID).

### Audit
- `auditLogs.action` adalah **kode** (mis. `kpi.create`), bukan prosa → **tidak**
  perlu di-i18n. Hanya **label di UI viewer audit** yang dilokalkan.

### Validasi Zod
- Skema mengembalikan **kunci pesan**; server action menerjemahkan via
  `getTranslations()` sesuai locale aktor. (Atau zod `errorMap` per-locale.)

---

## 5. Rencana bertahap (saat dikerjakan nanti)

> Tiap fase shippable & dapat diverifikasi. **Default EN** sejak Fase 0.

- **Fase 0 — Infra:** pasang `next-intl`; `request.ts`/`routing.ts`; provider di root
  layout; migrasi kolom `users.locale`; komponen toggle; scaffold `en.json`/`id.json`.
- **Fase 1 — Chrome bersama:** nav, layout, halaman auth, `error.tsx`/`not-found.tsx`,
  komponen `ui` umum.
- **Fase 2 — UI per modul:** employees, attendance, leave, overtime, payslip, kpi,
  training, asset, onboarding, analytics, tenant, security, audit. (string → kunci, 2 locale)
- **Fase 3 — Server actions + Zod:** pesan `error`/`success` & validasi → kunci.
- **Fase 4 — Notifikasi:** refactor `notify()` ke kunci+params; render terlokalisasi.
- **Fase 5 — Email:** template EN+ID; render per locale penerima.
- **Fase 6 — QA dwibahasa:** uji kedua bahasa; lint/cek kunci hilang (CI).

---

## 6. Risiko & catatan

- **Lintas-cutting & besar** — menyentuh ~73+ file; **multi-sesi**. Investasi infra,
  bukan fitur pengguna baru.
- **Jangan interleave dengan smoke-test** — mengubah semua string membatalkan checklist
  manual. Kerjakan sebagai track terpisah.
- **Kualitas terjemahan:** EN = sumber; **ID perlu di-review native** oleh Anda.
- **Konsistensi istilah HR** (mis. "cuti" = leave, "lembur" = overtime, "atasan" =
  manager) — buat glosarium di `messages/` agar seragam.
- **Cek kunci hilang** otomatis (script) agar tak ada teks bocor tak-terterjemah.
