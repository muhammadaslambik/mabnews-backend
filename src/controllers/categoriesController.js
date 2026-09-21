const pool = require("../config/db");

/* =========================================================
   GET /api/categories
   Menyertakan jumlah artikel per kategori (article_count)
   dihitung otomatis, bukan input manual.
   ========================================================= */
async function getCategories(req, res) {
  try {
    const result = await pool.query(`
      select
        c.*,
        count(a.id)::int as article_count
      from categories c
      left join articles a on a.category_id = c.id
      group by c.id
      order by c.name asc
    `);
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mengambil daftar kategori" });
  }
}

/* =========================================================
   POST /api/categories
   Body: { key, name, description, status }
   ========================================================= */
async function createCategory(req, res) {
  try {
    const { key, name, description, status = "Aktif" } = req.body;

    if (!key || !name) {
      return res.status(400).json({
        error: "Key dan name wajib diisi"
      });
    }

    const result = await pool.query(
      `insert into categories (key, name, description, status)
       values ($1, $2, $3, $4)
       returning *`,
      [key, name, description || null, status]
    );

    res.status(201).json({ data: { ...result.rows[0], article_count: 0 } });
  } catch (err) {
    console.error(err);
    if (err.code === "23505") {
      return res.status(409).json({
        error: "Kategori dengan key tersebut sudah ada"
      });
    }
    res.status(500).json({ error: "Gagal membuat kategori" });
  }
}

/* =========================================================
   PUT /api/categories/:id
   Body bebas (partial update): key, name, description, status
   ========================================================= */
async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const allowed = ["key", "name", "description", "status"];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const fields = Object.keys(updates);
    if (fields.length === 0) {
      return res.status(400).json({ error: "Tidak ada data untuk diperbarui" });
    }

    const setClause = fields
      .map((field, index) => `${field} = $${index + 1}`)
      .join(", ");
    const values = fields.map((field) => updates[field]);
    values.push(id);

    const result = await pool.query(
      `update categories set ${setClause} where id = $${values.length} returning *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Kategori tidak ditemukan" });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === "23505") {
      return res.status(409).json({
        error: "Kategori dengan key tersebut sudah ada"
      });
    }
    res.status(500).json({ error: "Gagal memperbarui kategori" });
  }
}

/* =========================================================
   DELETE /api/categories/:id
   ========================================================= */
async function deleteCategory(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "delete from categories where id = $1 returning id",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Kategori tidak ditemukan" });
    }

    res.json({ message: "Kategori berhasil dihapus" });
  } catch (err) {
    console.error(err);
    // Kategori masih dipakai artikel (category_id FK) -> ON DELETE SET NULL
    // di schema.sql, jadi harusnya tidak pernah masuk ke sini kecuali id
    // tidak ditemukan. Tetap ditangani untuk jaga-jaga.
    res.status(500).json({ error: "Gagal menghapus kategori" });
  }
}

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
