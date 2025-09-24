# KomplekKita - Sistem Manajemen Komplek Perumahan 🏘️

Platform manajemen komplek perumahan modern dengan fitur lengkap untuk pengelolaan keuangan, informasi warga, dan administrasi RT/RW. Dibangun dengan teknologi terbaru untuk pengalaman pengguna yang optimal.

## 🚀 Cara Menjalankan Aplikasi

### Prasyarat
- Node.js (versi 16 atau lebih baru)
- npm (versi 7 atau lebih baru) atau pnpm
- Git (untuk mengklon repositori)

### Langkah-langkah Instalasi

1. **Clone repositori**
   ```bash
   git clone [URL_REPOSITORY]
   cd KomplekKita
   ```

2. **Instal dependensi**
   ```bash
   npm install
   # atau
   pnpm install
   ```

3. **Jalankan server pengembangan**
   ```bash
   npm run dev
   # atau
   pnpm dev
   ```

4. **Buka di browser**
   Buka [http://localhost:4321](http://localhost:4321) di browser favorit Anda.

## 🖥️ Setup Backend

### Prasyarat Backend
- PHP 8.1 atau lebih baru
- Composer (package manager untuk PHP)
- MySQL/MariaDB
- Node.js & NPM (untuk frontend assets)

### Langkah-langkah Instalasi Backend

1. **Masuk ke direktori backend**
   ```bash
   cd api-komplek
   ```

2. **Instal dependensi PHP dengan Composer**
   ```bash
   composer install
   ```

3. **Jalankan server backend**
   ```bash
   php artisan serve
   ```
   Server backend akan berjalan di [http://127.0.0.1:8000](http://127.0.0.1:8000)



## 🔄 Menjalankan Frontend & Backend Bersamaan

1. **Terminal 1**: Jalankan backend
   ```bash
   cd api-komplek
   php artisan serve
   ```

2. **Terminal 2**: Jalankan frontend
   ```bash
   cd ..
   npm run dev
   ```

3. Buka browser ke [http://localhost:4321](http://localhost:4321) untuk mengakses aplikasi

## 🎮 Cara Mencoba Demo

### Demo Admin
1. Klik tombol "Masuk" di pojok kanan atas
2. Pilih "Login sebagai Admin"
3. Gunakan kredensial demo yang tersedia

### Demo User
1. Kunjungi halaman "/komplek"
2. Pilih komplek yang tersedia
3. Klik tombol "Lihat Demo"
4. Anda akan diarahkan ke dashboard user dengan akses penuh

## 🌟 **Fitur Utama**

### **Database & Backend**
- **Supabase Integration**: Aplikasi ini terintegrasi dengan Supabase sebagai backend service untuk manajemen database dan autentikasi.
- **PostgreSQL Database**: Menggunakan database PostgreSQL yang dihosting di Supabase untuk penyimpanan data yang aman dan terstruktur.
- **Authentication**: Sistem autentikasi yang aman menggunakan Supabase Auth.