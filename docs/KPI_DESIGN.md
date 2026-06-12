# Aranya HRIS — Desain Modul KPI / Performance Management

**Versi:** 2.0
**Tanggal:** 2026-06-12
**Status:** **REBUILD SELESAI.** Model berjenjang **Epic→Task→Sub-task** (§11)
sudah diimplementasi penuh (skema, modul, 5 halaman, RLS, tes). Model flat (§1–9)
tinggal sebagai catatan historis. Menunggu smoke-test, lalu **Bonus**.

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

> **Perbaikan disepakati (2026-06-12) — belum diimplementasi:**
> Guard aktivasi saat ini hanya mengecek karyawan yang **sudah punya** KPI, sehingga
> karyawan tanpa KPI sama sekali (mis. Siti) lolos. Keputusan:
> - **Cakupan = Opsi A:** setiap **karyawan aktif yang punya atasan langsung**
>   (`reportsToId` terisi) **wajib** punya KPI lengkap (bobot 100% & agreed) sebelum
>   periode bisa diaktifkan. Karyawan tanpa atasan (puncak hierarki) dikecualikan.
> - **Panel "Kesiapan aktivasi"** persisten di halaman detail periode: daftar blocker
>   per karyawan ("Siti — belum ada KPI"), atau "Siap diaktifkan ✓". Validasi server
>   tetap sumber kebenaran.
> Catatan: bila redesign **leveling** (lihat §11) jadi dikerjakan, perbaikan ini
> menyatu ke dalamnya (cek kelengkapan jadi 2 tingkat bobot).

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

---

## 11. Redesign: KPI berjenjang (Dimension → KPI → Sub-task) — SPEC FINAL

**Status:** parameter **disepakati 2026-06-12** (lewat 2 gambar scorecard nyata).
**Menggantikan** model flat (§1–9): tabel `kpis` satu tingkat → **pohon berjenjang**
berbasis scorecard. Perubahan **besar** (data model, scoring, ketiga halaman). Karena
pra-produksi → **rebuild bersih**, bukan migrasi data.

### 11.1 Terminologi (FINAL)

Nama di UI & kode = **Epic → Task → Sub-task** (keputusan user 2026-06-12).
Tabel: `kpi_epics`, `kpi_tasks`, `kpi_subtasks`. (Di template HR aslinya disebut
Dimension/KPI — kita pakai istilah user.)

| Tingkat | Contoh | Bobot |
|---------|--------|-------|
| **Epic** | "Financial", "Productivity" | Σ per karyawan = 100% |
| **Task** | "Target 80% utilization" | Σ per epic = 100% + rubrik 1–5 |
| **Sub-task** | rincian karyawan | tanpa bobot/skor |

### 11.2 Parameter terkunci

- **Hierarki:** Dimension → KPI → Sub-task (3 tingkat).
- **Bobot 2 tingkat:** Σ bobot **Dimension** per karyawan = **100%**; Σ bobot **KPI**
  dalam 1 Dimension = **100%**. (Sub-task **tanpa** bobot.)
- **Rubrik per KPI ("Predefined KPI Score"):** tabel **5 baris (skor 1–5)**, tiap level
  = kriteria konkret. **Target selalu = skor 3.** Mis. utilization: 1=0–30%, 2=31–79%,
  3=80%(target), 4=81–100%, 5=>100%.
- **Notes on KPI Target:** teks bebas pada KPI (mis. "95% utilization").
- **Sub-task:** opsional, **tanpa bobot & tanpa skor**, **dibuat karyawan saat eksekusi**
  sebagai ceklis/rincian pribadi (tidak memengaruhi skor).
- **Penilaian per KPI:**
  - **Realization** (teks capaian) — diisi **karyawan** saat penilaian.
  - **Notes on achievement** (teks) — catatan capaian.
  - **Skor 1–5 dipilih manual** merujuk rubrik (bukan auto-hitung):
    **SE (selfScore, karyawan)** → **managerScore (manajer)** → **finalScore (HR kalibrasi)**.
- **Skor yang dipakai di rumus = `finalScore`** (SE & manager hanya tahapan).

### 11.3 Rumus skor (bottom-up, rentang 1–5)

```
Kontribusi KPI   = finalScore × (bobotKPI / 100)
Skor Dimension   = Σ kontribusi KPI dalam dimensi          (≤ 5, krn ΣbobotKPI=100%)
Kontribusi Dim   = Skor Dimension × (bobotDimension / 100)
SKOR AKHIR       = Σ kontribusi Dimension                  (rentang 1–5)
```

Contoh (dari gambar, Dimension "Financial" bobot 20%):
| KPI | bobot KPI | final | Score×bobotKPI |
|-----|-----------|-------|----------------|
| 1.1 | 60% | 4 | 2.4 |
| 1.2 | 40% | 5 | 2.0 |
| | | **Skor Dimensi** | **4.4** |

Kontribusi Dimensi = 4.4 × 20% = **0.88**. Skor akhir = Σ semua kontribusi dimensi.

### 11.4 Data model

> Semua tabel tenant-scoped (`tenantId` + RLS). KPI lama (flat) di-drop.

**`kpi_scorecards`** — satu per (karyawan, periode); pemegang agreement
| kolom | tipe | catatan |
|-------|------|---------|
| periodId | fk kpi_periods | |
| employeeId | fk employees | unik (periodId, employeeId) |
| managerId | text (userId) | penyusun |
| status | text | `draft → proposed → agreed \| revision_requested` |
| revisionNote, agreedAt | text?/ts? | |

**`kpi_epics`** (= Epic)
| kolom | tipe |
|-------|------|
| scorecardId | fk kpi_scorecards (cascade) |
| name | text |
| weight | integer (%, Σ per scorecard = 100) |

**`kpi_tasks`** (= Task) — menggantikan `kpis` flat
| kolom | tipe | catatan |
|-------|------|---------|
| epicId | fk kpi_epics (cascade) | |
| title | text | |
| weight | integer | %, Σ per epic = 100 |
| targetNote | text? | "Notes on KPI Target" |
| rubric | jsonb | 5 entri `{score:1..5, criteria}` (target=3) |

**`kpi_subtasks`** — opsional, milik karyawan
| kolom | tipe |
|-------|------|
| taskId | fk kpi_tasks (cascade) |
| title | text |
| isDone | boolean |
| createdById | text (userId) |

**`kpi_appraisals`** — per Task (extend dari Fase C)
| kolom | tipe | catatan |
|-------|------|---------|
| taskId | fk kpi_tasks (unik) | |
| realization | text? | capaian (karyawan) |
| selfScore | int? | 1–5 (SE, karyawan) |
| managerScore | int? | 1–5 (manajer) |
| finalScore | int? | 1–5; default = managerScore; override HR |
| selfNote, managerNote, notesOnAchievement | text? | |
| calibratedById | text? | userId HR |

**Tetap dipakai (per Task):** `kpi_progress` (progres % + bukti) & `kpi_feedback`
(feedback manajer) — direstruktur agar FK ke `kpi_tasks`. (Keputusan: dipertahankan.)

### 11.5 State machine & siklus

Periode (HR): `planning → active → appraisal → locked` (tetap).
**Agreement pindah ke scorecard** (bukan per-KPI): `draft → proposed → agreed | revision_requested`.

- **Planning:** manajer susun scorecard (dimensions + KPIs + bobot + rubrik + target note)
  → **Kirim** (proposed) → karyawan **Setujui / Minta revisi** (per scorecard).
- **Active:** karyawan tambah **sub-task** (opsional) + update progres/bukti; manajer feedback.
- **Appraisal:** karyawan isi **Realization** + **SE (1–5)** per KPI; manajer isi **managerScore**.
- **Locked:** HR **kalibrasi** `finalScore`; skor akhir bertingkat final.

### 11.6 Guard aktivasi (gabung perbaikan §5, Opsi A)

Periode boleh `planning → active` bila untuk **setiap karyawan aktif ber-`reportsToId`**:
1. punya **scorecard** berstatus **agreed**, dan
2. **Σ bobot Dimension = 100%**, dan
3. **tiap Dimension: Σ bobot KPI = 100%.**

Karyawan tanpa atasan (puncak hierarki) dikecualikan. **Panel "Kesiapan aktivasi"**
persisten di halaman periode menampilkan blocker per karyawan ("Siti — belum ada scorecard",
"Budi/Financial — bobot KPI 80%").

### 11.7 Catatan terbuka — RESOLVED (2026-06-12)

1. **Penamaan UI:** **Epic / Task / Sub-task** (istilah user). ✓
2. **`kpi_progress` (progres % + bukti):** **dipertahankan** berdampingan dgn sub-task. ✓
3. **Rubrik:** **tepat 5 baris**, kriteria teks bebas (boleh sebagian kosong selain target). ✓

### 11.8 Dampak implementasi (rebuild)

- Drop/restruktur `kpis`; tambah `kpi_scorecards`, `kpi_dimensions`, `kpi_subtasks`;
  extend `kpi_appraisals`. RLS + integration test untuk tabel baru.
- Tulis ulang 3 halaman (karyawan/manajer/HR) untuk editor pohon 2 tingkat + input
  realization/skor + panel kesiapan.
- Validasi bobot 2 tingkat (murni, teruji). Rumus skor bertingkat (murni, teruji).
- Pra-produksi → tidak ada migrasi data; demo seed diperbarui bila perlu.
- **Bonus** menunggu model ini final (mewarisi skor akhir).
