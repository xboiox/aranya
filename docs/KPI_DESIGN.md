# Aranya HRIS — Desain Modul KPI / Performance Management

**Versi:** 0.1 (draft untuk review)
**Tanggal:** 2026-06-09
**Status:** belum diimplementasi — dokumen perencanaan

Menggantikan KPI MVP lama (satu skor self-assessment) dengan siklus manajemen
kinerja 3 fase. Dibangun **bertahap A → B → C**, tiap fase shippable.

---

## 1. Keputusan terkunci

| Topik | Keputusan |
|-------|-----------|
| Urutan build | Bertahap **A → B → C** (mulai Fase A) |
| Cascade | v1 = **company objective sebagai referensi** (tanpa link parent-child wajib) |
| Skala skor | **1–5** per indikator |
| Bobot | **persen, total per karyawan per periode = 100%** |
| Penetap KPI | **direct manager** untuk bawahan langsung (via `reportsToId`) |
| HR | pengatur **periode** + **kalibrasi/lock** + input company objective |
| Template KPI | **ditunda ke v2** (v1 buat dari nol; "salin dari periode lalu" = opsi v2 ringan) |
| KPI lama | **dihapus bersih** (pra-produksi, bukan migrasi data) |

---

## 2. Peran & tanggung jawab

| Peran | Wewenang |
|-------|----------|
| **HR Admin** | Buat/atur **periode** & statusnya; input **company objective**; **kalibrasi** skor akhir; **lock** periode; lihat semua |
| **Direct Manager** | Buat & kirim **KPI** untuk bawahan langsung; monitoring; beri **feedback**; **nilai** (manager score) saat appraisal |
| **Karyawan** | **Setujui / minta revisi** KPI; **update progres** + bukti; **self-assessment** + tulis kendala |

Otorisasi memakai `reportsToId` (manajer langsung) + RBAC (`hr_admin`). Pola
"agree / request-revision" **berbeda** dari approve/reject cuti → butuh logika
sendiri (tidak langsung reuse `decideApproval`).

---

## 3. Model data

> Semua tabel: `tenantId` + RLS (ENABLE+FORCE+policy) + integration test isolasi.
> Kolom umum `id, createdAt, updatedAt` diringkas.

### Fase A — Perencanaan

**`kpi_periods`** — siklus penilaian (dikelola HR)
| kolom | tipe | catatan |
|-------|------|---------|
| name | text | mis. "KPI Q1 2026" |
| type | text | `quarterly` \| `annual` |
| startDate, endDate | date | |
| status | text | `planning` → `active` → `appraisal` → `locked` |

**`company_objectives`** — target perusahaan top-down (referensi, Fase A)
| kolom | tipe |
|-------|------|
| periodId | fk kpi_periods |
| title, description | text |

**`kpis`** — indikator per karyawan
| kolom | tipe | catatan |
|-------|------|---------|
| periodId | fk kpi_periods | |
| employeeId | fk employees | pemilik KPI |
| managerId | text (userId) | yang menetapkan |
| title, description | text | |
| weight | integer | persen; total/karyawan/periode = 100 |
| target | text | deskripsi target (mis. "Omzet 500jt") |
| status | text | `draft` → `proposed` → `agreed` \| `revision_requested` |
| revisionNote | text? | alasan karyawan minta revisi |
| agreedAt | timestamp? | |

### Fase B — Eksekusi & Monitoring

**`kpi_progress`** — update progres (historis)
| kolom | tipe | catatan |
|-------|------|---------|
| kpiId | fk kpis | |
| percent | integer | 0–100 progres |
| note | text? | |
| evidencePath | text? | lampiran via storage abstraction (GCS/lokal) |
| createdById | text (userId) | |

**`kpi_feedback`** — feedback manajer saat monitoring
| kolom | tipe |
|-------|------|
| kpiId | fk kpis |
| fromUserId | text |
| message | text |

### Fase C — Penilaian

**`kpi_appraisals`** — penilaian akhir per KPI
| kolom | tipe | catatan |
|-------|------|---------|
| kpiId | fk kpis (unik) | |
| selfScore | integer? | 1–5, diisi karyawan |
| selfNote | text? | kendala yang dihadapi |
| managerScore | integer? | 1–5, diisi manajer |
| managerNote | text? | |
| finalScore | integer? | 1–5; default = managerScore, bisa di-override HR (kalibrasi) |
| calibratedById | text? | userId HR yang mengkalibrasi |

---

## 4. Formula skor

- Tiap indikator dinilai **1–5** (`finalScore`).
- **Skor akhir karyawan per periode** = Σ ( `weight_i` / 100 × `finalScore_i` ) → rentang **1–5**.
- Ditampilkan sebagai angka 1–5 (opsional juga persen = skor/5×100).
- Skor inilah yang nanti jadi basis **Bonus** (Modul 2 berikutnya).

---

## 5. State machine

### Periode (transisi oleh HR)
```
planning ──▶ active ──▶ appraisal ──▶ locked
```
| Status | Yang boleh terjadi |
|--------|--------------------|
| `planning` | Manajer susun & kirim KPI; karyawan setujui/minta revisi |
| `active` | KPI terkunci edit; karyawan update progres; manajer feedback |
| `appraisal` | Self-assessment + manager scoring |
| `locked` | Read-only; HR kalibrasi final & terbitkan laporan |

### KPI individual (dalam `planning`)
```
draft ──(manajer kirim)──▶ proposed ──(karyawan setuju)──▶ agreed
                              │
                              └─(karyawan minta revisi)─▶ revision_requested ──▶ (manajer revisi) ──▶ proposed
```
- HR baru boleh menggeser periode ke `active` jika **semua KPI = agreed** dan
  **total bobot tiap karyawan = 100%** (validasi guard).

---

## 6. Lingkup v1 = Fase A (yang akan dibangun pertama)

**HR**
- CRUD `kpi_periods`; transisi `planning → active`.
- Input `company_objectives` (referensi yang dilihat manajer).
- Guard aktivasi: tolak ke `active` bila ada KPI belum `agreed` / bobot ≠ 100%.

**Manajer**
- Buat KPI untuk bawahan langsung (title, deskripsi, bobot, target).
- Lihat indikator total bobot per karyawan (harus 100%).
- Kirim (→ `proposed`); revisi bila karyawan menolak.

**Karyawan**
- Lihat KPI `proposed`; **Setujui** (→ `agreed`) atau **Minta revisi** (+ catatan).

**Lintas**
- Gating **MODULE_2**; RLS semua tabel; notifikasi (propose → karyawan;
  agreed/revisi → manajer); audit.

**Halaman (rencana)**
- `/dashboard/kpi` — karyawan: KPI saya + setujui/revisi (+ progres di Fase B)
- `/dashboard/kpi/team` — manajer: KPI bawahan + susun/kirim
- `/dashboard/kpi/periods` — HR: kelola periode + company objective + aktivasi/lock

---

## 7. Ringkas Fase B & C (detail menyusul saat gilirannya)

- **B:** progres + bukti (upload), feedback manajer, (v2) dasbor merah/hijau + reminder otomatis + completion rate.
- **C:** self-assessment + kendala, manager scoring, HR lock + kalibrasi final, laporan kinerja.

---

## 8. Backlog v2 (sengaja ditunda)

- Cascade berjenjang formal (company → dept → individual dengan traceability).
- Template KPI / "salin dari periode sebelumnya".
- Reminder otomatis & completion-rate dashboard.
- Kendala level-periode (selain per-KPI).
- Laporan kinerja PDF.

---

## 9. Migrasi & dampak

- **Hapus** tabel `kpi_evaluations` + modul/halaman KPI lama (self-score). Migration drop.
- Tambah tabel baru bertahap (Fase A dulu) + RLS + perluas
  `module2-rls.integration.test.ts`.
- HR Analytics: metrik "rata-rata KPI" disesuaikan ke skor akhir model baru
  (atau disembunyikan sampai Fase C ada).
