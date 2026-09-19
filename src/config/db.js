const { Pool } = require("pg");
require("dotenv").config();

if (!process.env.DATABASE_URL) {
  console.warn(
    "[PERINGATAN] DATABASE_URL belum diisi di file .env"
  );
}

/*
 * Neon (dan kebanyakan Postgres cloud) mewajibkan koneksi SSL.
 * rejectUnauthorized:false dipakai supaya tidak perlu mengurus
 * sertifikat CA secara manual — aman untuk pemakaian umum di
 * proyek seperti ini.
 *
 * Opsi tambahan di bawah ini KHUSUS untuk lingkungan serverless
 * (Vercel): tanpa ini, satu koneksi yang macet/basi bisa menahan
 * SELURUH proses sampai 300 detik, bahkan untuk endpoint yang
 * tidak menyentuh database sama sekali.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 8000,  // gagal cepat kalau koneksi baru tidak nyambung dalam 8 detik
  idleTimeoutMillis: 10000,       // tutup koneksi menganggur setelah 10 detik
  query_timeout: 8000,            // gagal cepat kalau query tidak selesai dalam 8 detik
  max: 5,                         // batasi jumlah koneksi bersamaan (cocok untuk serverless)
  allowExitOnIdle: true           // KUNCI: jangan sampai koneksi menganggur menahan proses selesai
});

pool.on("error", (err) => {
  console.error("Kesalahan tak terduga pada koneksi database:", err);
});

module.exports = pool;