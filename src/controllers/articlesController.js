const pool = require("../config/db");

/*
 * Ubah judul menjadi slug (konsisten dengan createArticleSlug
 * yang dipakai di portal/kategori.js).
 */
function slugify(title) {
  return title
    .toString()
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/*
 * Query dasar yang menyertakan data kategori (JOIN),
 * dipakai berulang di beberapa endpoint di bawah.
 */
const BASE_SELECT = `
  select
    a.*,
    json_build_object(
      'id', c.id,
      'key', c.key,
      'name', c.name
    ) as category
  from articles a
  left join categories c on c.id = a.category_id
`;

/* =========================================================
   GET /api/articles
   Query yang didukung:
     ?kategori=nasional  -> filter berdasarkan key kategori
     ?q=kata+kunci        -> cari di judul & ringkasan
     ?popular=true         -> hanya artikel populer
     ?status=draft          -> filter status (published/draft/scheduled)
                                 ?status=all -> semua status, tanpa filter
                                 tidak dikirim -> tidak difilter (semua status,
                                 sama seperti perilaku lama, supaya tidak
                                 memutus halaman "Semua Artikel" & portal publik
                                 yang belum kirim parameter ini)
     ?limit=10&page=1      -> pagination
   ========================================================= */
async function getArticles(req, res) {
  try {
    const {
      kategori,
      q,
      popular,
      status,
      limit = 20,
      page = 1
    } = req.query;

    const conditions = [];
    const values = [];

    if (kategori && kategori !== "all") {
      values.push(kategori);
      conditions.push(`c.key = $${values.length}`);
    }

    if (popular === "true") {
      conditions.push("a.is_popular = true");
    }

    if (status && status !== "all") {
      values.push(status);
      conditions.push(`a.status = $${values.length}`);
    }

    if (q) {
      values.push(`%${q}%`);
      conditions.push(
        `(a.title ilike $${values.length} or a.lead ilike $${values.length})`
      );
    }

    const whereClause =
      conditions.length > 0
        ? "where " + conditions.join(" and ")
        : "";

    const limitNum = Number(limit);
    const offsetNum = (Number(page) - 1) * limitNum;

    values.push(limitNum);
    const limitPlaceholder = `$${values.length}`;
    values.push(offsetNum);
    const offsetPlaceholder = `$${values.length}`;

    const listQuery = `
      ${BASE_SELECT}
      ${whereClause}
      order by a.published_at desc
      limit ${limitPlaceholder}
      offset ${offsetPlaceholder}
    `;

    const countQuery = `
      select count(*)::int as total
      from articles a
      left join categories c on c.id = a.category_id
      ${whereClause}
    `;

    const [listResult, countResult] = await Promise.all([
      pool.query(listQuery, values),
      pool.query(countQuery, values.slice(0, values.length - 2))
    ]);

    res.json({
      data: listResult.rows,
      total: countResult.rows[0].total
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mengambil daftar artikel" });
  }
}

/* =========================================================
   GET /api/articles/:slug
   ========================================================= */
async function getArticleBySlug(req, res) {
  try {
    const { slug } = req.params;
    const result = await pool.query(
      `${BASE_SELECT} where a.slug = $1`,
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Artikel tidak ditemukan" });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mengambil artikel" });
  }
}

/* =========================================================
   POST /api/articles
   Body: { title, lead, content: [...], image_url, caption,
           author, category_key, is_popular, tags: [...],
           keywords, seo_meta_description, status, scheduled_at }
   ========================================================= */
async function createArticle(req, res) {
  try {
    const {
      title,
      lead,
      content = [],
      image_url,
      caption,
      author = "MAB-News",
      category_key,
      is_popular = false,
      tags = [],
      keywords,
      seo_meta_description,
      status = "published",
      scheduled_at = null
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Judul wajib diisi" });
    }

    let category_id = null;
    if (category_key) {
      const catResult = await pool.query(
        "select id from categories where key = $1",
        [category_key]
      );
      category_id = catResult.rows[0]?.id || null;
    }

    const slug = slugify(title);

    const insertResult = await pool.query(
      `insert into articles
        (slug, title, lead, content, image_url, caption, author, category_id,
         is_popular, tags, keywords, seo_meta_description, status, scheduled_at)
       values
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       returning id`,
      [
        slug,
        title,
        lead,
        JSON.stringify(content),
        image_url,
        caption,
        author,
        category_id,
        is_popular,
        Array.isArray(tags) ? tags : [],
        keywords || null,
        seo_meta_description || null,
        status,
        scheduled_at
      ]
    );

    const fullResult = await pool.query(
      `${BASE_SELECT} where a.id = $1`,
      [insertResult.rows[0].id]
    );

    res.status(201).json({ data: fullResult.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === "23505") {
      return res.status(409).json({
        error: "Artikel dengan judul/slug yang sama sudah ada"
      });
    }
    res.status(500).json({ error: "Gagal membuat artikel" });
  }
}

/* =========================================================
   PUT /api/articles/:slug
   Body bebas (partial update) — field yang dikenal tabel
   articles langsung disetel, termasuk tags/keywords/
   seo_meta_description/status/scheduled_at.
   ========================================================= */
async function updateArticle(req, res) {
  try {
    const { slug } = req.params;
    const updates = { ...req.body };

    if (updates.title) {
      updates.slug = slugify(updates.title);
    }

    if (updates.category_key) {
      const catResult = await pool.query(
        "select id from categories where key = $1",
        [updates.category_key]
      );
      updates.category_id = catResult.rows[0]?.id || null;
      delete updates.category_key;
    }

    if (updates.content) {
      updates.content = JSON.stringify(updates.content);
    }

    if (updates.tags && !Array.isArray(updates.tags)) {
      delete updates.tags;
    }

    const fields = Object.keys(updates);
    if (fields.length === 0) {
      return res.status(400).json({ error: "Tidak ada data untuk diperbarui" });
    }

    const setClause = fields
      .map((field, index) => `${field} = $${index + 1}`)
      .join(", ");
    const values = fields.map((field) => updates[field]);
    values.push(slug);

    const updateResult = await pool.query(
      `update articles set ${setClause} where slug = $${values.length} returning id`,
      values
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: "Artikel tidak ditemukan" });
    }

    const fullResult = await pool.query(
      `${BASE_SELECT} where a.id = $1`,
      [updateResult.rows[0].id]
    );

    res.json({ data: fullResult.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal memperbarui artikel" });
  }
}

/* =========================================================
   DELETE /api/articles/:slug
   ========================================================= */
async function deleteArticle(req, res) {
  try {
    const { slug } = req.params;
    const result = await pool.query(
      "delete from articles where slug = $1 returning id",
      [slug]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Artikel tidak ditemukan" });
    }

    res.json({ message: "Artikel berhasil dihapus" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal menghapus artikel" });
  }
}

module.exports = {
  getArticles,
  getArticleBySlug,
  createArticle,
  updateArticle,
  deleteArticle,
  slugify
};
