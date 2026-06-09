# Aranya HRIS — Checklist Manual Testing

**Tujuan:** panduan klik-per-klik untuk memverifikasi alur UI yang tidak ditangkap
oleh unit/integration test. Tandai `[x]` setelah lolos. 🆕 = fitur baru yang paling
perlu diverifikasi.

> Cara pakai: jalankan dari atas. Jika ada yang gagal, catat **langkah + yang terjadi
> + yang diharapkan**, lalu lapor. Tidak harus selesai sekali duduk.

---

## 0. Prasyarat

- [ ] App jalan: `npm run dev` → buka http://localhost:3000
- [ ] Punya data untuk dites. Dua opsi:
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

---

## 1. Login, 2FA & Navigasi

- [ ] Login `hr@demo.aranya` → diminta setup/isi **2FA** (TOTP) → berhasil masuk `/dashboard`
- [ ] Salah password → pesan error jelas (tidak membocorkan detail)
- [ ] 🆕 **Sign out**: klik kartu user di **bawah sidebar** → menu terbuka **tanpa
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

### KPI — Performance Management Fase A 🆕

> Modul KPI dirombak total (lihat `docs/KPI_DESIGN.md`). Alur baru = siklus goal
> setting 3 peran. Uji **end-to-end** dengan urutan di bawah. Butuh minimal 1
> manajer + 1 bawahan langsung (mis. demo: Manager → Budi).

**Fase A — Perencanaan (HR) — `/dashboard/kpi/periods`**
- [ ] HR: **Buat Periode** (nama, tipe Kuartalan/Tahunan, tanggal mulai–selesai)
      → muncul di daftar berstatus **Perencanaan**
- [ ] Tanggal selesai sebelum mulai → ditolak dengan pesan
- [ ] Klik **Kelola →** periode → halaman detail
- [ ] **Target Perusahaan**: tambah 1–2 target (referensi) → muncul; hapus salah satu
- [ ] **Aktifkan periode** saat belum ada KPI / bobot belum 100% → **ditolak** dengan
      pesan masalah (mis. "Budi: total bobot 0% (harus 100%)")

**Penyusunan KPI (Manajer) — `/dashboard/kpi/team`**
- [ ] Login **Manager** → buka KPI Tim → pilih periode (status Perencanaan)
- [ ] **Tambah KPI** untuk bawahan langsung (judul, bobot, target) → muncul sebagai **Draf**
- [ ] Tambah beberapa KPI hingga **total bobot per karyawan = 100%** (indikator
      hijau saat 100%, kuning bila belum)
- [ ] **Ubah** KPI draf → tersimpan; **Hapus** KPI draf → hilang
- [ ] **Kirim** KPI → status berubah **Menunggu persetujuan**
- [ ] Manajer **tidak bisa** membuat KPI untuk karyawan yang bukan bawahannya
      (dropdown hanya berisi bawahan langsung; HR bisa untuk semua)

**Goal Agreement (Karyawan) — `/dashboard/kpi`**
- [ ] Login **Budi** → KPI Saya → KPI berstatus **Menunggu persetujuan** terlihat
- [ ] **Setujui** satu KPI → status jadi **Disetujui** + notifikasi ke manajer
- [ ] **Minta revisi** KPI lain (+ catatan) → status **Minta revisi** + notifikasi ke manajer
- [ ] Manajer melihat catatan revisi di KPI Tim → **Ubah** lalu **Kirim** ulang →
      karyawan menyetujui

**Aktivasi (HR)**
- [ ] Setelah semua KPI tiap karyawan **bobot 100% & Disetujui**, HR **Aktifkan periode**
      → status jadi **Berjalan**; form & tombol KPI terkunci (tidak bisa diubah)
- [ ] Coba akses `/dashboard/kpi/periods` sebagai **Karyawan** (non-HR) → diarahkan keluar

> Catatan: progres/bukti, penilaian akhir & kalibrasi = Fase B & C (belum ada).

### Onboarding/Offboarding (`/dashboard/onboarding`)
- [ ] HR (`/onboarding/manage`): pilih karyawan + tipe → **Terapkan checklist standar**
      → tugas muncul; tambah tugas manual; centang/hapus tugas; progress bar berubah
- [ ] Karyawan: "Checklist Saya" menampilkan progres (read-only)

### HR Analytics (`/dashboard/analytics`)
- [ ] HR: kartu statistik (aktif, hadir hari ini, cuti hari ini, antrian persetujuan
      = cuti+lembur, karyawan baru, nonaktif) tampil
- [ ] Breakdown per Departemen / Tipe Kontrak / Gender tampil dengan bar
- [ ] Catatan: kartu "rata-rata KPI" sengaja **tidak ada** (kembali saat KPI Fase C)

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
