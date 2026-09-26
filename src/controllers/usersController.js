const pool = require("../config/db");

/* =========================================================
   GET /api/users
   Daftar pengguna CMS (untuk pemilih identitas & daftar
   penerima pesan). Tidak pernah mengirim password_hash.
========================================================= */
async function getUsers(req, res) {
    try {
        const result = await pool.query(
            `select id, username, coalesce(display_name, username) as display_name
             from admin_users
             order by id asc`
        );
        res.json({ data: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Gagal mengambil daftar pengguna" });
    }
}

module.exports = { getUsers };
