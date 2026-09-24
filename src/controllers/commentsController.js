const pool = require("../config/db");

/* =========================================================
   GET /api/articles/:slug/comments
   ========================================================= */
async function getComments(req, res) {
  try {
    const { slug } = req.params;

    const article = await pool.query(
      "select id, allow_comments from articles where slug = $1",
      [slug]
    );
    if (article.rows.length === 0) {
      return res.status(404).json({ error: "Artikel tidak ditemukan" });
    }

    const result = await pool.query(
      `select id, name, content, created_at
       from comments
       where article_id = $1
       order by created_at desc`,
      [article.rows[0].id]
    );

    res.json({
      data: result.rows,
      total: result.rows.length,
      allow_comments: article.rows[0].allow_comments !== false
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mengambil komentar" });
  }
}

/* =========================================================
   POST /api/articles/:slug/comments
   Body: { name, content }
   ========================================================= */
async function createComment(req, res) {
  try {
    const { slug } = req.params;
    const name = (req.body.name || "").trim();
    const content = (req.body.content || "").trim();

    if (!name || !content) {
      return res.status(400).json({ error: "Nama dan komentar wajib diisi" });
    }
    if (name.length > 100) {
      return res.status(400).json({ error: "Nama maksimal 100 karakter" });
    }
    if (content.length > 2000) {
      return res.status(400).json({ error: "Komentar maksimal 2000 karakter" });
    }

    const article = await pool.query(
      "select id, allow_comments from articles where slug = $1",
      [slug]
    );
    if (article.rows.length === 0) {
      return res.status(404).json({ error: "Artikel tidak ditemukan" });
    }
    if (article.rows[0].allow_comments === false) {
      return res.status(403).json({ error: "Komentar dinonaktifkan untuk artikel ini" });
    }

    const result = await pool.query(
      `insert into comments (article_id, name, content)
       values ($1, $2, $3)
       returning id, name, content, created_at`,
      [article.rows[0].id, name, content]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mengirim komentar" });
  }
}

/* =========================================================
   DELETE /api/comments/:id
   (untuk moderasi dari admin nanti, kalau dibutuhkan)
   ========================================================= */
async function deleteComment(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "delete from comments where id = $1 returning id",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Komentar tidak ditemukan" });
    }
    res.json({ message: "Komentar berhasil dihapus" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal menghapus komentar" });
  }
}

module.exports = { getComments, createComment, deleteComment };
