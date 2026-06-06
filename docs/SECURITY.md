# Aranya HRIS — Security Architecture

**Versi:** 1.0.0  
**Tanggal:** 2026-06-06

Dokumen ini merangkum kontrol keamanan inti Aranya dan cara kerjanya.

---

## 1. Multi-Tenant Isolation (PostgreSQL RLS)

**Properti keamanan #1** untuk platform multi-tenant: data satu perusahaan tidak boleh
bocor ke perusahaan lain.

### Mekanisme

- Setiap tabel tenant-scoped punya kolom `tenant_id` + PostgreSQL Row Level Security (RLS).
- Policy: baris hanya terlihat jika `tenant_id = current_tenant_id()` **atau** `is_super_admin()`.
- Context di-set per-transaksi lewat `set_config`:
  - `withTenantContext(tenantId, fn)` → `app.current_tenant` → hanya lihat data tenant itu
  - `withSuperAdminContext(fn)` → `app.bypass_rls = 'on'` → operasi sistem / Super Admin

### ⚠️ Wajib: App role NON-superuser

PostgreSQL **superuser dan table owner otomatis bypass RLS** (bahkan dengan `FORCE ROW
LEVEL SECURITY`). Image Docker `postgres` membuat `POSTGRES_USER` sebagai **superuser**.

Karena itu:

| Koneksi | Role | Dipakai untuk | RLS |
|---------|------|---------------|-----|
| `DATABASE_URL` | `aranya_app` (NOSUPERUSER, NOBYPASSRLS) | App runtime (`src/lib/db`) | **Dienforce** |
| `ADMIN_DATABASE_URL` | superuser/owner | Migrasi, seed, RLS, setup-role | Bypass (admin) |

- `FORCE ROW LEVEL SECURITY` aktif di semua tabel tenant-scoped (untuk jaga-jaga).
- App role dibuat via `npm run db:setup-role` (NOSUPERUSER, NOBYPASSRLS, hanya DML).
- **Terverifikasi**: tanpa context → 0 baris; tenant context → hanya baris tenant; bypass → semua.

### Query pre-auth / lintas-tenant

Beberapa lookup terjadi sebelum tenant diketahui (login bootstrap, validasi token undangan).
Ini dibungkus `withSuperAdminContext` secara eksplisit karena bersifat operasi sistem:

- `auth.ts` JWT callback — baca `employees` + `user_roles` saat login
- `invite/[token]` page & action — validasi token undangan
- `createTenantAction` — tulis `tenant_modules` + `invitations`

---

## 2. Authentication (Auth.js v5)

- Password di-hash dengan **bcrypt** (cost 12).
- Session JWT dengan **timeout per role**: super_admin 2j, hr_admin 4j, manager/employee 8j
  (di-set via `token.exp` di JWT callback berdasarkan role tertinggi).
- Password reset: token 32-byte, expiry **24 jam**, **single-use** (`usedAt` ditandai).
  Anti-enumeration: endpoint selalu balas sukses meski email tidak terdaftar.
- Undangan: token 32-byte, expiry **7 hari**, single-use (`acceptedAt`).

---

## 3. Two-Factor Authentication (TOTP)

- TOTP (Google Authenticator) via `@otplib`.
- **Mandatory** untuk `super_admin` & `hr_admin`; opsional untuk `manager` & `employee`
  (enforcement redirect di `src/proxy.ts`).
- **TOTP secret dienkripsi at rest** dengan **AES-256-GCM** (`src/lib/utils/crypto.ts`,
  kunci `AUTH_ENCRYPTION_KEY` 32-byte). Secret tidak pernah disimpan plaintext.
- Backup codes: 8 kode single-use, di-**hash bcrypt** sebelum disimpan, auto-invalidate saat dipakai.

---

## 4. Audit Trail

- Helper `logAudit()` (`src/lib/audit.ts`) menulis ke `audit_logs` lewat bypass context.
- Mencatat: action, entityType/entityId, oldValues/newValues, ipAddress, userAgent.
- Kegagalan audit **tidak menggagalkan** operasi utama (selalu di-catch).
- Event yang tercatat saat ini:
  - `auth.login` — setiap login sukses (via NextAuth `events.signIn`)
  - `auth.password_reset` — reset password berhasil
  - `auth.invite_accepted` — undangan diterima
  - `auth.2fa_enabled` — 2FA diaktifkan
  - `tenant.create` — tenant baru dibuat

---

## 5. File Storage (GCS)

- Bucket privat — tidak ada akses publik.
- Akses lewat **signed URL** TTL pendek (15 menit), di-generate backend.
- Isolasi antar tenant via prefix path `{tenant_id}`.
- Kredensial GCS di-inject sebagai base64 env var (`GCS_CREDENTIALS_BASE64`), bukan file di image.

---

## 5b. Integritas Data Absensi GPS

**Kontrol yang ada:**
- Validasi geofence dilakukan **di server** (koordinat dari client tidak dipercaya mentah) — `evaluateAttendance`.
- **Ambang akurasi GPS** (`MAX_ACCURACY_METERS = 100`): saat geofencing aktif, pembacaan dengan
  akurasi lebih buruk ditolak (mencegah validasi atas posisi yang tidak andal).
- Koordinat + akurasi + flag `within_geofence` disimpan per check-in/out untuk audit.

**⚠️ Limitasi yang diketahui — GPS spoofing:**
Geolocation berbasis browser **dapat dipalsukan** (DevTools, fake-GPS app, emulator). Aranya
**tidak** menggunakan selfie/face-recognition (keputusan produk), sehingga absensi GPS via browser
**tidak anti-fraud secara penuh**. Mitigasi yang berlaku saat ini hanya ambang akurasi + audit trail.

Mitigasi lanjutan (jadwal ke depan, bukan sekarang):
- Native app dengan deteksi mock-location (Android `isFromMockProvider`)
- Flag anomali (lonjakan jarak antar absensi tak masuk akal)
- Opsi selfie per-tenant jika klien memerlukan kepastian lebih tinggi

---

## 6. Transport & Headers

- HTTPS wajib (Let's Encrypt via Coolify).
- Security headers (`next.config.js` + Nginx): HSTS, X-Frame-Options, X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy (geolocation hanya self — untuk absensi GPS).

---

## 7. Secrets Management

- Semua secret di `.env` (gitignored). `.env.example` hanya placeholder.
- Secret kritis: `AUTH_SECRET`, `AUTH_ENCRYPTION_KEY`, `DATABASE_URL`, `ADMIN_DATABASE_URL`,
  `GCS_CREDENTIALS_BASE64`, `RESEND_API_KEY`, `STRIPE_SECRET_KEY`.
- `AUTH_ENCRYPTION_KEY` generate: `openssl rand -hex 32`. Rotasi memerlukan re-enkripsi TOTP secret.

---

## Checklist Sebelum Produksi

- [ ] `DATABASE_URL` pakai role non-superuser (`npm run db:setup-role` sudah dijalankan)
- [ ] `ADMIN_DATABASE_URL` tidak pernah dipakai app runtime
- [ ] `npm run db:rls` sudah dijalankan (RLS + FORCE aktif)
- [ ] Semua secret di-generate ulang (bukan nilai dev)
- [ ] `AUTH_ENCRYPTION_KEY` di-backup aman (kehilangan = TOTP secret tidak bisa didekripsi)
- [ ] 2FA diaktifkan untuk semua Super Admin & HR Admin
- [ ] Verifikasi RLS isolation di environment produksi
