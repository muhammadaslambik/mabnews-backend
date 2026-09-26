const pool = require("../config/db");

/* =========================================================
   GET /api/authors
   ========================================================= */
async function getAuthors(req, res) {
  try {
    const result = await pool.query(
      "select * from authors order by name asc"
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mengambil daftar penulis" });
  }
}

/* =========================================================
   POST /api/authors
   Body: { name, photo_url }
   Kalau nama penulis sudah ada, foto akan ditimpa (upsert) —
   supaya gampang dipakai untuk "tambah atau update foto".
   ========================================================= */
async function upsertAuthor(req, res) {
  try {
    const name = (req.body.name || "").trim();
    const photo_url = (req.body.photo_url || "").trim() || null;

    if (!name) {
      return res.status(400).json({ error: "Nama penulis wajib diisi" });
    }

    const result = await pool.query(
      `insert into authors (name, photo_url)
       values ($1, $2)
       on conflict (name) do update set photo_url = excluded.photo_url
       returning *`,
      [name, photo_url]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal menyimpan data penulis" });
  }
}

/* =========================================================
   DELETE /api/authors/:id
   ========================================================= */
async function deleteAuthor(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "delete from authors where id = $1 returning id",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Penulis tidak ditemukan" });
    }
    res.json({ message: "Data penulis berhasil dihapus" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal menghapus data penulis" });
  }
}

module.exports = { getAuthors, upsertAuthor, deleteAuthor };
