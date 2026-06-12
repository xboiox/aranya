# Aranya HRIS — Checklist Manual Testing

**Tujuan:** panduan klik-per-klik untuk memverifikasi alur UI yang tidak ditangkap
oleh unit/integration test. Tandai `[x]` setelah lolos. 🆕 = fitur baru yang paling
perlu diverifikasi.

> Cara pakai: jalankan dari atas. Jika ada yang gagal, catat **langkah + yang terjadi
> + yang diharapkan**, lalu lapor. Tidak harus selesai sekali duduk.

---

## 0. Prasyarat

- [x] App jalan: `npm run dev` → buka http://localhost:3000
- [x] Punya data untuk dites. Dua opsi:
  - **Cepat (disarankan):** `npm run db:seed:demo` → tenant **PT Demo Aranya**
    (semua modul aktif). Akun di bawah.
  - **Tenant sendiri:** pastikan **MODULE_2 aktif** agar menu Modul 2 muncul
    (login super_admin → `/tenants` → pilih tenant → aktifkan modul).

**Akun demo** (password semua: `Demo1234!`):

| Peran | Email | Untuk menguji |
|-------|-------|---------------|
| HR Admin | `hr@demo.aranya` | mayoritas fitur manajemen |
| Manager | `manager@demo.aranya` | approval bawahan |
| Karyawan | `budi@demo.aranya`, `siti@demo.aranya` | self-service |

> **Catat:** menu Modul 2 (Training, Aset, KPI, Onboarding, HR Analytics) **hanya
> muncul bila MODULE_2 aktif** untuk tenant tsb. Jika menu tidak terlihat, itu
> kemungkinan masalah aktivasi modul, bukan bug.
>
> **Catat (KPI):** `db:seed:demo` **belum** membuat data KPI — jadi halaman KPI akan
> kosong di awal. Itu normal; Anda membuat periode + KPI sendiri saat menjalankan
> Smoke Test di bawah. (Penyemaian skenario KPI = peningkatan yang bisa dibuat nanti.)

---

## ⭐ Smoke Test Cepat (≈15 menit) — jalankan ini dulu

> Jalur prioritas end-to-end **KPI model berjenjang** (Epic → Task → Sub-task).
> Lakukan **berurutan** dengan 3 login bergantian. Buka **DevTools → Console**
> sepanjang pengujian — tidak boleh ada error merah.
> Istilah: **Epic** (dimensi, Σ bobot=100%) → **Task** (KPI, Σ bobot/epic=100% +
> rubrik skor 1–5, target=3) → **Sub-task** (opsional, dibuat karyawan).

**A. HR menyiapkan periode** (login `hr@demo.aranya`)
- [ ] `/dashboard/kpi/periods` → **Buat Periode** (mis. "KPI Q3 2026", Kuartalan) → **Perencanaan**
- [ ] **Kelola →** → tambah **Target Perusahaan**; panel **Kesiapan Aktivasi** menampilkan
      blocker (mis. "Budi — belum ada scorecard KPI", "Siti — …")
- [ ] Coba **Aktifkan** → **ditolak** (scorecard belum lengkap/disetujui)

**B. Manajer menyusun scorecard** (login `manager@demo.aranya`)
- [ ] `/dashboard/kpi/team` → pilih periode → tiap bawahan ada tombol **Buat scorecard** → klik
- [ ] **Kelola →** scorecard Budi → tambah **Epic** (mis. "Financial" bobot 100% atau
      beberapa epic Σ=100%) → tambah **Task** (judul, bobot, **Notes on KPI Target**, isi
      **rubrik skor 1–5**) hingga **Task per epic Σ=100%** (indikator hijau)
- [ ] **Kirim ke karyawan** → status **Menunggu persetujuan** (validasi bobot jalan)

**C. Karyawan menyetujui** (login `budi@demo.aranya`)
- [ ] `/dashboard/kpi` → scorecard tampil dgn pohon Epic→Task → **Setujui** (atau **Minta
      revisi** + catatan, lalu manajer ubah & kirim ulang)
- [ ] Notifikasi manajer ter-update (klik → diarahkan ke KPI Tim)

**D. HR mengaktifkan** (login `hr@demo.aranya`)
- [ ] Panel **Kesiapan Aktivasi** kini **✓ Siap diaktifkan** → **Aktifkan periode** → **Berjalan**

**E. Eksekusi** (periode Berjalan)
- [ ] Karyawan (`/dashboard/kpi`): per Task tambah **Sub-task**, **Update progres** (% + bukti)
- [ ] Manajer (`/dashboard/kpi/team/[scorecard]`): lihat progres, kirim **feedback** → karyawan melihatnya

**F. Penilaian** (HR **Mulai tahap penilaian** dari periode)
- [ ] Karyawan: per Task isi **Realization** + **SE (1–5)** merujuk rubrik
- [ ] Manajer: per Task beri **nilai manajer (1–5)** + catatan
- [ ] HR **Kunci periode** (ditolak bila ada task belum dinilai) → **Terkunci** → **kalibrasi**
      skor akhir → **skor akhir tertimbang** muncul ke karyawan & manajer

**G. Cek keamanan**
- [ ] Login Karyawan → buka `/dashboard/kpi/periods` langsung → **ditarik keluar**
- [ ] Console **bersih** sepanjang A–F

> Jika semua ✅ → KPI berjenjang sehat. Bila ada ❌, lapor (format di bawah).

---

## 1. Login, 2FA & Navigasi

- [x] Login `hr@demo.aranya` → diminta setup/isi **2FA** (TOTP) → berhasil masuk `/dashboard`
- [ ] Salah password → pesan error jelas (tidak membocorkan detail)
- [x] 🆕 **Sign out**: klik kartu user di **bawah sidebar** → menu terbuka **tanpa
      console error** → klik **Keluar** → balik ke `/login`
- [ ] Buka **DevTools → Console**: tidak ada warning merah Base UI
      (`MenuGroupContext` / `nativeButton`) saat membuka menu user
- [ ] Di layar kecil (mobile/responsive), buka menu navigasi → user menu + Keluar
      tetap bisa diakses

---

## 2. Karyawan (`/dashboard/employees`) — sebagai HR Admin

### Daftar, kolom & paginasi 🆕
- [ ] Tabel tampil dengan kolom **Nama, Jabatan, Departemen, Atasan Langsung, Status**
- [ ] Kolom **Atasan Langsung** terisi untuk karyawan yang punya atasan (mis. Budi → Manager)
- [ ] Jika karyawan > 25, muncul kontrol **paginasi** + label "Menampilkan X–Y dari Z";
      tombol **Berikutnya/Sebelumnya** berfungsi & disabled di ujung

### Pencarian 🆕
- [ ] Ketik nama di kotak **Cari** → klik **Cari** → hasil terfilter
- [ ] Cari dengan **email** (sebagian) → ikut ketemu
- [ ] Saat sedang mencari lalu pindah halaman paginasi → **kata kunci tetap** dipertahankan
- [ ] Tombol **Reset** mengosongkan pencarian

### Export CSV 🆕
- [ ] Klik **Export CSV** → file `karyawan-YYYY-MM-DD.csv` terunduh
- [ ] Buka di Excel/Sheets → kolom rapi, **berisi semua karyawan** (bukan hanya 1 halaman),
      ada kolom **Atasan Langsung**, teks Indonesia tidak rusak (BOM UTF-8)

### Import massal via CSV 🆕
- [ ] Klik **Import CSV** → halaman `/dashboard/employees/import`
- [ ] Klik **Unduh template CSV** → dapat `template-karyawan.csv` berisi 3 baris contoh
- [ ] **Happy path:** isi template 2–3 karyawan baru (email unik) → unggah → **Impor**
      → ringkasan "**N berhasil diimpor & diundang**", 0 gagal
- [ ] Karyawan baru muncul di daftar; **email undangan** terkirim (atau fallback link
      bila Resend belum dikonfigurasi)
- [ ] **reportsToEmail:** buat baris manager dulu (atas), lalu baris karyawan yang
      `reportsToEmail`-nya = email manager tsb → atasan ter-set otomatis
- [ ] **Validasi:** sisipkan baris email tidak valid + 1 baris role salah (mis. `boss`)
      → baris itu **gagal dengan alasan jelas**, baris lain tetap berhasil
- [ ] **Duplikat:** dua baris email sama → hanya satu dibuat, satunya dilaporkan duplikat
- [ ] Unggah file dengan header salah/kosong → pesan error header
- [ ] Unggah ulang file yang sudah pernah berhasil → semua dilaporkan "email sudah
      terdaftar" (tidak membuat duplikat)

### Tambah/edit satu karyawan
- [ ] **+ Tambah Karyawan** → isi form → simpan → muncul di daftar, console bersih
- [ ] Klik nama karyawan → halaman detail → ubah jabatan/atasan → simpan → ter-update

---

## 3. Absensi

### Self-service (`/dashboard/attendance`) — sebagai Karyawan
- [ ] Check-in → tercatat jam masuk (+ status terlambat bila lewat jam shift)
- [ ] Check-out → tercatat jam keluar
- [ ] (Jika geofencing aktif) di luar radius → ditolak dengan pesan lokasi

### Absensi Tim (`/dashboard/attendance/team`) — sebagai HR 🆕
- [ ] **Rentang tanggal**: set **Dari–Sampai** beberapa hari → tabel menampilkan
      baris **per karyawan per tanggal**, ada kolom **Tanggal** & **Departemen**
- [ ] **Filter Departemen**: pilih satu departemen → hanya karyawan dept itu tampil
- [ ] **Filter Status**: Hadir / Alpha / Terlambat → baris tersaring sesuai
- [ ] **Cari nama** → tersaring; ringkasan menunjukkan "(terfilter dari N)"
- [ ] **Paginasi** muncul bila baris > 50; filter dipertahankan saat pindah halaman
- [ ] **Koreksi**: ubah jam masuk/keluar satu baris → **Simpan** → tersimpan (refresh
      tetap ada); tombol Simpan disabled sebelum ada perubahan
- [ ] **Export CSV**: klik → file ikut **rentang & filter**; isi ada kolom Tanggal &
      Departemen, status (Hadir/Alpha/Terlambat) benar

---

## 4. Cuti (`/dashboard/leave`)

- [ ] **Karyawan**: ajukan cuti tahunan → tampil "Menunggu"; saldo berkurang sesuai
      hari kerja (akhir pekan/libur tidak dihitung)
- [ ] Ajukan melebihi saldo → ditolak dengan pesan saldo
- [ ] Ajukan tanggal tumpang tindih dengan pengajuan aktif → ditolak
- [ ] **Manager/HR** (`/dashboard/leave/approvals`): pengajuan bawahan muncul di inbox
- [ ] **Setujui** → status berubah; **Tolak** dengan alasan → alasan tersimpan
- [ ] 🆕 **Riwayat** di bawah inbox menampilkan keputusan + **"oleh {nama approver}"** +
      tanggal keputusan
- [ ] **Anti-self-approve**: HR mencoba approve pengajuannya sendiri → ditolak
- [ ] Karyawan membatalkan pengajuan yang masih pending → batal

---

## 5. Lembur (`/dashboard/overtime`)

- [ ] **Karyawan**: ajukan lembur (cek durasi terhitung, termasuk lewat tengah malam)
- [ ] **Manager/HR** (`/overtime/approvals`): setujui / tolak (dengan alasan)
- [ ] 🆕 **Riwayat** menampilkan keputusan + **nama pemberi approval** + tanggal
- [ ] Anti-self-approve berlaku

---

## 6. Notifikasi (`/dashboard/notifications`) 🆕

- [ ] Setelah ada pengajuan/keputusan, lonceng/menu notifikasi memunculkan item
- [ ] **Klik notifikasi pengajuan** (mis. "Pengajuan cuti baru") → diarahkan ke
      **inbox persetujuan** terkait + notifikasi jadi terbaca
- [ ] **Klik notifikasi keputusan** (mis. "Cuti disetujui") → diarahkan ke halaman
      **pemohon** (cuti/lembur)
- [ ] 🆕 **Notifikasi KPI**: "KPI baru menunggu persetujuan" → `/dashboard/kpi`;
      "KPI disetujui/minta revisi" → `/dashboard/kpi/team`
- [ ] Notifikasi tanpa tujuan (mis. sistem) tidak menampilkan "Lihat detail →"
- [ ] **Tandai semua dibaca** berfungsi

---

## 7. Modul 2 (perlu MODULE_2 aktif)

> Bila menu tidak muncul, aktifkan MODULE_2 dulu (lihat Prasyarat).

### Training (`/dashboard/training`)
- [ ] HR (`/training/manage`): tambah training; karyawan melihatnya di daftar

### Aset (`/dashboard/assets`)
- [ ] HR (`/assets/manage`): tambah aset → **pinjamkan** ke karyawan → karyawan
      melihat aset di "Aset Saya" → **kembalikan** aset → hilang dari karyawan

### KPI — Performance Management berjenjang (Epic → Task → Sub-task) 🆕

> Model dirombak (lihat `docs/KPI_DESIGN.md §11`). Alur end-to-end ada di **⭐ Smoke
> Test Cepat** di atas. Bagian ini = **edge case & regresi** tambahan.

**Perencanaan & bobot**
- [ ] Tanggal periode: selesai sebelum mulai → ditolak
- [ ] Manajer **tidak bisa** membuat scorecard untuk yang bukan bawahan langsung
      (HR bisa untuk semua)
- [ ] Bobot: epic Σ ≠ 100% **atau** task dalam satu epic Σ ≠ 100% → indikator kuning;
      **Kirim** ditolak dengan pesan bobot
- [ ] Rubrik task: 5 baris skor 1–5; baris 3 ditandai **(target)**
- [ ] Panel **Kesiapan Aktivasi** (HR, halaman periode): daftar blocker per karyawan
      wajib (mis. "Siti — belum ada scorecard KPI") → **✓ Siap** saat semua lengkap & agreed
- [ ] Karyawan tanpa atasan langsung **tidak** menghalangi aktivasi (dikecualikan)

**Goal agreement**
- [ ] Karyawan **Minta revisi** (+ catatan) → manajer melihat catatan, ubah, kirim ulang,
      karyawan setujui → status **Disetujui**

**Eksekusi (Berjalan)**
- [ ] Sub-task: tambah / centang / hapus (oleh karyawan)
- [ ] Update progres + **unggah bukti** (PDF/gambar ≤5MB); >5MB / tipe lain → ditolak
- [ ] **Otorisasi bukti**: user lain (bukan pemilik/atasan/HR) buka `/api/kpi/evidence/<id>`
      → **403**
- [ ] Feedback manajer → notifikasi ke karyawan; klik notifikasi → halaman benar

**Penilaian & skor**
- [ ] **HR Kunci periode** saat ada task belum dinilai manajer → **ditolak** dgn pesan
- [ ] Skor akhir = **bottom-up tertimbang** (cek contoh: Task 60%×skor4 + 40%×skor5 =
      epik 4.4; × bobot epik). Bandingkan dgn template scorecard Anda
- [ ] Kalibrasi HR (periode Terkunci): ubah skor final satu task → skor akhir ikut berubah
- [ ] Non-HR (manajer/karyawan) **tidak** punya form kalibrasi
- [ ] **HR Analytics**: kartu **"Rata-rata KPI"** muncul (skor akhir periode terkunci)

> Siklus KPI berjenjang lengkap. Selanjutnya: Bonus (memakai skor akhir).

### Onboarding/Offboarding (`/dashboard/onboarding`)
- [ ] HR (`/onboarding/manage`): pilih karyawan + tipe → **Terapkan checklist standar**
      → tugas muncul; tambah tugas manual; centang/hapus tugas; progress bar berubah
- [ ] Karyawan: "Checklist Saya" menampilkan progres (read-only)

### HR Analytics (`/dashboard/analytics`)
- [ ] HR: kartu statistik (aktif, hadir hari ini, cuti hari ini, antrian persetujuan
      = cuti+lembur, karyawan baru, nonaktif) tampil
- [ ] Breakdown per Departemen / Tipe Kontrak / Gender tampil dengan bar
- [ ] 🆕 Kartu **"Rata-rata KPI"** muncul = rata-rata skor akhir periode KPI terkunci
      (1–5); "—" bila belum ada periode terkunci

---

## 8. Lainnya

- [ ] **Slip Gaji** (`/dashboard/payslip`): karyawan unduh PDF; HR kelola/unggah
- [ ] **Struktur Organisasi** (`/dashboard/organization`): pohon atasan-bawahan benar
- [ ] **Audit Log** (`/dashboard/audit`): aksi (create/approve/dll) tercatat; paginasi jalan
- [ ] **Keamanan** (`/dashboard/security`): atur/nonaktifkan 2FA, backup codes
- [ ] **Tenant** (`/tenants`, super_admin): buat tenant, aktif/nonaktif modul,
      undang HR admin

---

## 9. Lintas-cutting (penting)

- [ ] **Console bersih**: selama mengeklik fitur di atas, tidak ada error/warning
      merah di DevTools Console
- [ ] **Isolasi multi-tenant** (jika punya >1 tenant): login HR tenant A tidak bisa
      melihat data tenant B di mana pun (daftar karyawan, absensi, export CSV)
- [ ] **Gating modul**: dengan MODULE_2 nonaktif, akses langsung URL `/dashboard/kpi`
      dll menampilkan layar "modul terkunci", bukan data
- [ ] **Otorisasi**: login sebagai Karyawan lalu akses langsung URL HR (mis.
      `/dashboard/employees`, `/dashboard/attendance/team`) → diarahkan keluar/ditolak

---

## Cara melaporkan temuan

Untuk tiap bug, sebutkan:
1. **Halaman/URL** + peran akun
2. **Langkah** yang dilakukan
3. **Yang terjadi** (sertakan teks error / screenshot console bila ada)
4. **Yang diharapkan**
