# Aranya HRIS — Database Schema

**Versi:** 1.0.0  
**Tanggal:** 2026-06-06  
**ORM:** Drizzle ORM | **Database:** PostgreSQL 17

---

## Arsitektur

**Multi-tenant:** Shared Database + `tenant_id` + PostgreSQL Row Level Security (RLS)

Setiap tabel yang memiliki data per-tenant memiliki kolom `tenant_id`.  
RLS policies + `FORCE ROW LEVEL SECURITY` di `src/lib/db/rls.sql` enforce isolasi di level database.  
Application code menggunakan `withTenantContext()` atau `withSuperAdminContext()` dari `src/lib/db/index.ts`.

> **Penting:** RLS hanya benar-benar dienforce jika app konek sebagai role **non-superuser**
> (`aranya_app`, dibuat via `npm run db:setup-role`). Superuser/owner PostgreSQL bypass RLS.
> Lihat [SECURITY.md](./SECURITY.md) untuk detail arsitektur isolasi tenant.

---

## Grup Tabel

### Auth (Auth.js v5)

| Tabel | Deskripsi |
|-------|-----------|
| `users` | Akun login. Fields: id, name, email, password (bcrypt), emailVerified |
| `accounts` | OAuth provider links (Google, dll.) |
| `sessions` | Database sessions (JWT strategy) |
| `verification_tokens` | Email verification tokens |
| `password_resets` | Token reset password, expiry 24 jam, single-use |
| `user_two_factor` | TOTP secret (Google Authenticator) + backup codes |

**Relasi penting:**
- `users` ← `accounts` (one-to-many)
- `users` ← `sessions` (one-to-many)
- `users` ← `user_two_factor` (one-to-one)
- `users` ← `password_resets` (one-to-many)

---

### Tenant Management

| Tabel | Deskripsi |
|-------|-----------|
| `tenants` | Data perusahaan. Fields: id, name, slug, logoUrl, subscriptionStatus |
| `tenant_modules` | Modul yang aktif per tenant. Unique (tenantId, moduleCode) |
| `tenant_config` | Key-value config per tenant (jam kerja, timezone, dll.) |
| `holidays` | Hari libur. `tenant_id = NULL` → nasional, diisi → company holiday |

**Module codes:** `MODULE_1`, `MODULE_2`, `MODULE_3`

---

### RBAC

| Tabel | Deskripsi |
|-------|-----------|
| `roles` | Role definitions. `tenant_id = NULL` → system role (super_admin) |
| `user_roles` | User-role assignments. Satu user bisa punya banyak role di satu tenant |
| `permissions` | Permission codes (e.g. `leave:approve`, `payroll:read`) |
| `role_permissions` | Mapping role → permissions |

**System roles:** `super_admin`, `hr_admin`, `manager`, `employee`

**Multi-role:** HR Admin yang juga karyawan punya dua entries di `user_roles`:
```
user_roles: { userId, roleId: hr_admin_role_id, tenantId }
user_roles: { userId, roleId: employee_role_id, tenantId }
```

---

### Employee Master Data

| Tabel | Deskripsi |
|-------|-----------|
| `employees` | Data karyawan. 1:1 dengan `users`. Berisi data personal, kepegawaian, bank, BPJS |

**Kolom kritis:**
- `userId` — FK ke `users.id` (unique — satu user = satu employee record)
- `tenantId` — FK ke `tenants.id`
- `reportsToId` — self-referential FK ke `employees.id` (NULL untuk top of hierarchy)
- `baseSalary`, `ptkpStatus` — digunakan Modul 3 (Payroll & Compliance)

**Approval chain:** Saat karyawan A mengajukan cuti, sistem lookup `employees.reportsToId` untuk menentukan approver.  
**Constraint:** `approver_id ≠ requester_id` di-enforce di application layer.

---

### Audit & Notifications

| Tabel | Deskripsi |
|-------|-----------|
| `audit_logs` | Log semua perubahan data sensitif. Fields: action, entityType, entityId, oldValues, newValues, ipAddress |
| `notifications` | In-app notifications per user per tenant |

---

### Invitations & Onboarding

| Tabel | Deskripsi |
|-------|-----------|
| `invitations` | Invite links. `tenant_id = NULL` → invite buat tenant baru (oleh Super Admin) |

**Alur onboarding:**
1. Super Admin buat tenant baru di platform
2. Super Admin kirim invite link ke HR Admin (`invitations` record dibuat)
3. HR Admin klik link → register → `acceptedAt` diisi → user + employee record dibuat
4. HR Admin setup konfigurasi perusahaan (jadwal, shift, dll.)

---

### Tax Rates (Managed by Super Admin)

| Tabel | Deskripsi |
|-------|-----------|
| `tax_rate_layers` | Tarif PPh 21 progresif per tahun (layer penghasilan kena pajak) |
| `ptkp_values` | Nilai PTKP per tahun per status (TK/0, K/0, K/1, dll.) |
| `bpjs_rates` | Tarif BPJS per tahun per tipe (JKK, JKM, JHT, JP, Kesehatan) |

---

## RLS Context

```typescript
// Di semua server actions & API routes yang bukan Super Admin:
await withTenantContext(session.user.tenantId, async (tx) => {
  return tx.query.employees.findMany()  // otomatis ter-filter by tenant
})

// Di Super Admin routes:
await withSuperAdminContext(async (tx) => {
  return tx.query.tenants.findMany()  // bypass RLS, lihat semua
})
```

---

## Schema Files

```
src/lib/db/schema/
├── auth.ts          users, accounts, sessions, verificationTokens, passwordResets, userTwoFactor
├── tenants.ts       tenants, tenantModules, tenantConfig, holidays
├── rbac.ts          roles, userRoles, permissions, rolePermissions
├── employees.ts     employees
├── audit.ts         auditLogs
├── notifications.ts notifications
├── invitations.ts   invitations
├── tax-rates.ts     taxRateLayers, ptkpValues, bpjsRates
└── index.ts         re-export semua
```

**RLS policies:** `src/lib/db/rls.sql` — jalankan setelah `drizzle-kit migrate` pertama kali.
