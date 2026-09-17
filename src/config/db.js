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
 */
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.on("error", (err) => {
    console.error("Kesalahan tak terduga pada koneksi database:", err);
});

module.exports = pool;
