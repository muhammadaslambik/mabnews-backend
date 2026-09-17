# MAB-News Backend

Backend API untuk portal berita MAB-News.

**Stack:**
- **Node.js + Express** — logika backend/API
- **Neon** — database PostgreSQL (gratis, tanpa kartu, auto-wake otomatis)
- **ImageKit.io** — penyimpanan & optimasi gambar (gratis, tanpa kartu)
- **Vercel** — hosting backend sebagai serverless function (gratis)

## Struktur Folder

```
mabnews-backend/
├── server.js                  <- setup Express app
├── api/
│   └── index.js                <- pintu masuk khusus untuk Vercel
├── vercel.json                 <- konfigurasi routing Vercel
├── package.json
├── .env.example                <- contoh konfigurasi, salin jadi .env
├── sql/
│   └── schema.sql               <- jalankan ini di Neon SQL Editor
└── src/
    ├── config/
    │   ├── db.js                 <- koneksi ke Neon (pg Pool)
    │   └── imagekit.js           <- konfigurasi ImageKit SDK
    ├── controllers/
    │   ├── articlesController.js
    │   ├── categoriesController.js
    │   └── uploadController.js
    └── routes/
        ├── articles.js
        ├── categories.js
        └── upload.js
```

## Langkah Setup

### 1. Buat database di Neon

1. Buka https://neon.tech, sign up/login (bisa pakai akun GitHub).
2. Klik **Create a project**, kasih nama (misal `mabnews`), pilih region
   terdekat (misal Singapore).
3. Setelah project dibuat, Anda otomatis diarahkan ke halaman connection
   string. Salin nilai yang berbentuk seperti:
   ```
   postgres://user:password@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
   Ini nanti diisi ke `DATABASE_URL`.

### 2. Jalankan skema database

1. Di dashboard Neon, buka menu **SQL Editor** di sidebar.
2. Buka file `sql/schema.sql` di folder ini, salin semua isinya, tempel
   di SQL Editor, lalu jalankan (Run).
3. Cek menu **Tables** — harus muncul `categories`, `articles`, dan
   `admin_users`.

### 3. Buat akun ImageKit untuk penyimpanan gambar

1. Buka https://imagekit.io, sign up gratis.
2. Setelah masuk dashboard, buka **Developer Options** di sidebar.
3. Salin tiga nilai berikut:
   - **Public Key**
   - **Private Key**
   - **URL Endpoint** (bentuknya `https://ik.imagekit.io/nama-akun-anda`)

### 4. Setup project di komputer

```bash
cd mabnews-backend
npm install
cp .env.example .env
```

Buka file `.env`, isi keempat nilai di atas (DATABASE_URL, IMAGEKIT_PUBLIC_KEY,
IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT).

### 5. Jalankan backend

```bash
npm run dev
```

Kalau berhasil:
```
MAB-News API berjalan di http://localhost:3000
```

## Cara Kerja Upload Gambar (Penting)

Backend ini **tidak** menerima file gambar langsung. Sebagai gantinya,
gambar di-upload **langsung dari browser (CMS) ke ImageKit**, dengan
langkah:

1. CMS memanggil `GET /api/upload/auth` ke backend ini → dapat
   `token`, `expire`, `signature`.
2. CMS memakai ImageKit SDK versi browser (`imagekit-javascript`) untuk
   upload file ke ImageKit langsung, memakai `token`/`expire`/`signature`
   tadi plus **Public Key** (aman ditaruh di frontend, beda dengan
   Private Key yang harus tetap rahasia di server).
3. ImageKit membalas dengan URL gambar yang sudah online — URL inilah
   yang disimpan sebagai `image_url` saat membuat/mengubah artikel lewat
   `POST`/`PUT /api/articles`.

Pola ini dipakai supaya file besar tidak perlu "mampir" ke server kita
dulu — lebih cepat dan lebih hemat kuota, khususnya karena backend ini
nanti jalan sebagai serverless function di Vercel yang punya batas
ukuran request.

## Daftar Endpoint

| Method | Endpoint                  | Keterangan                        |
|--------|-----------------------------|------------------------------------|
| GET    | `/api/articles`             | Daftar artikel (bisa difilter)     |
| GET    | `/api/articles/:slug`       | Detail satu artikel                |
| POST   | `/api/articles`              | Tambah artikel baru                |
| PUT    | `/api/articles/:slug`       | Ubah artikel                       |
| DELETE | `/api/articles/:slug`       | Hapus artikel                      |
| GET    | `/api/categories`            | Daftar kategori                    |
| POST   | `/api/categories`            | Tambah kategori baru               |
| GET    | `/api/upload/auth`           | Ambil signature untuk upload gambar |

Query parameter untuk `GET /api/articles`:
- `?kategori=nasional` — filter berdasarkan kategori
- `?q=kata+kunci` — cari di judul & ringkasan
- `?popular=true` — hanya artikel populer
- `?limit=10&page=1` — pagination

## Kenapa Tidak Ada Lagi "Workflow Keepalive"?

Versi backend sebelumnya (waktu masih pakai Supabase) disertai script
GitHub Actions untuk menyapa database tiap beberapa hari, supaya tidak
kena auto-pause.

**Neon tidak butuh ini.** Neon memang dirancang untuk "tidur" (scale to
zero) saat tidak dipakai, lalu **otomatis bangun sendiri** dalam
hitungan detik begitu ada request masuk — tanpa perlu diklik manual di
dashboard. Kalau tetap dipaksa "disapa" terus-menerus, itu cuma
memboroskan jatah compute-hours bulanan Anda tanpa manfaat apa pun.

## Deploy ke Vercel

1. Push folder ini ke repository GitHub (repo terpisah, misalnya
   `mabnews-backend`).
2. Buka https://vercel.com, login pakai akun GitHub.
3. **Add New** > **Project** > pilih repo `mabnews-backend`.
4. Di bagian **Environment Variables**, tambahkan semua isi `.env` Anda
   (DATABASE_URL, IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY,
   IMAGEKIT_URL_ENDPOINT, CORS_ORIGIN).
5. Klik **Deploy**. Setelah selesai, Anda dapat URL publik (misalnya
   `https://mabnews-backend.vercel.app`) — inilah alamat API yang nanti
   dipanggil CMS dan portal.

## Langkah Selanjutnya

- [ ] Tambahkan autentikasi admin (login CMS) sebelum endpoint
      POST/PUT/DELETE dibuka ke publik — saat ini semua endpoint masih
      bisa diakses siapa saja yang tahu alamat API-nya.
- [ ] Sambungkan halaman-halaman di folder `admin/` (CMS) ke API ini,
      termasuk form upload gambar memakai `imagekit-javascript`.
- [ ] Migrasikan data yang sekarang hardcode di `js/article.js`,
      `js/kategori.js`, `js/homepage.js` ke database ini lewat endpoint
      `POST /api/articles`.
- [ ] Ganti fetch data di portal (`berita.html`, `kategori.html`, dst.)
      dari data statis menjadi `fetch()` ke API ini.
