# 📖 Literasi Brebesan

**🔗 Akses Langsung:** [literasibrebesan.my.id](https://literasibrebesan.my.id)

Selamat datang di repositori resmi **Literasi Brebesan**, sebuah proyek web komunitas yang bertujuan menjadi wadah dokumentasi dan publikasi kegiatan literasi di wilayah Brebes.

## 🎯 Tujuan Proyek

- Menyediakan platform terpusat untuk berbagi tulisan dan dokumentasi kegiatan.
- Memudahkan komunitas dalam mengelola agenda dan publikasi.
- Memberi ruang bagi penulis lokal untuk berkontribusi.

## 🧩 Fitur Berdasarkan Peran

### 👤 Pengunjung (Publik)
- Melihat landing page.
- Membaca publikasi dan dokumentasi yang sudah tayang.

### ✍️ User (Penulis)
- Mendaftar dan login ke sistem.

- Membuat dan mengirimkan postingan untuk diverifikasi admin.

### 👑 Admin (Pengelola)
- Login ke panel khusus.
- Memverifikasi atau menolak postingan dari user.
- Membuat dan menerbitkan postingan sendiri.
- Membuat dan mengelola agenda kegiatan.

## 🛡️ Keamanan & Performa Infrastruktur

Aplikasi ini didesain tangguh di atas lingkungan *serverless* dengan fitur:
- **Rate Limiting:** Proteksi *Brute-Force* dan pencegahan DDoS pada endpoint autentikasi.
- **Short-Lived JWT & Revocation:** Akses kontrol admin yang ketat dengan penolakan instan *(force logout)* saat terjadi perubahan wewenang.
- **ImageKit CDN:** Seluruh unggahan gambar diproses secara *real-time* via CDN, dilengkapi *garbage collector* (auto-delete) untuk menghindari penumpukan ruang penyimpanan (*storage leak*).
- **Optimistic Locking:** *Cron Jobs* otomatis dijalankan untuk mengatur publikasi agenda secara aman dari *race-condition*.

## 🗺️ Alur Navigasi

`Beranda` → `Publikasi` → `Masuk/Daftar` → `Dasbor`

## ⚖️ Lisensi

Kode sumber proyek ini dilindungi oleh lisensi **GNU General Public License v3.0**. Silakan merujuk ke berkas [LICENSE](LICENSE) untuk informasi lebih lanjut.

---

_Mari majukan literasi Brebes bersama-sama._
