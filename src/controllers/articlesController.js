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
    ) as category,
    coalesce(
      (
        select json_agg(
          json_build_object('id', c2.id, 'key', c2.key, 'name', c2.name)
          order by c2.name
        )
        from article_categories ac
        join categories c2 on c2.id = ac.category_id
        where ac.article_id = a.id
      ),
      '[]'
    ) as categories
  from articles a
  left join categories c on c.id = a.category_id
`;

/*
 * Ambil daftar id kategori yang valid dari array key.
 * Dipakai oleh createArticle & updateArticle.
 */
async function resolveCategoryIds(keys) {
  const uniqueKeys = [...new Set((keys || []).filter(Boolean))];
  if (uniqueKeys.length === 0) return [];
  const result = await pool.query(
    "select id, key from categories where key = any($1::text[])",
    [uniqueKeys]
  );
  // Urutkan sesuai urutan key yang dikirim, supaya kategori pertama
  // yang dipilih user tetap jadi "kategori utama" (category_id).
  return uniqueKeys
    .map((key) => result.rows.find((r) => r.key === key)?.id)
    .filter(Boolean);
}

/*
 * Timpa daftar kategori sebuah artikel di tabel relasi.
 */
async function setArticleCategories(articleId, categoryIds) {
  await pool.query("delete from article_categories where article_id = $1", [
    articleId
  ]);
  if (categoryIds.length === 0) return;
  const values = categoryIds
    .map((_, i) => `($1, $${i + 2})`)
    .join(", ");
  await pool.query(
    `insert into article_categories (article_id, category_id) values ${values}
     on conflict do nothing`,
    [articleId, ...categoryIds]
  );
}

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
      conditions.push(`
        exists (
          select 1 from article_categories ac
          join categories cf on cf.id = ac.category_id
          where ac.article_id = a.id and cf.key = $${values.length}
        )
      `);
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

    // Statistik untuk kartu ringkasan di halaman "Semua Artikel"
    // (dihitung dari SEMUA artikel, tanpa filter pencarian/kategori/status,
    // supaya angkanya konsisten dengan "Total Articles")
    const statsQuery = `
      select
        count(*)::int as total_count,
        count(*) filter (where is_popular = true)::int as popular_count,
        count(*) filter (where show_on_homepage = true)::int as homepage_count
      from articles
    `;

    const [listResult, countResult, statsResult] = await Promise.all([
      pool.query(listQuery, values),
      pool.query(countQuery, values.slice(0, values.length - 2)),
      pool.query(statsQuery)
    ]);

    res.json({
      data: listResult.rows,
      total: countResult.rows[0].total,
      stats: statsResult.rows[0]
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
           author, category_keys: [...], is_popular, tags: [...],
           keywords, seo_meta_description, status, scheduled_at }
   (category_key tunggal masih didukung untuk kompatibilitas lama)
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
      category_keys,
      is_popular = false,
      tags = [],
      keywords,
      seo_meta_description,
      status = "published",
      scheduled_at = null,
      allow_comments = true,
      show_on_homepage = true
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Judul wajib diisi" });
    }

    const keysInput = Array.isArray(category_keys)
      ? category_keys
      : category_key
      ? [category_key]
      : [];
    const categoryIds = await resolveCategoryIds(keysInput);
    const primaryCategoryId = categoryIds[0] || null;

    const slug = slugify(title);

    const insertResult = await pool.query(
      `insert into articles
        (slug, title, lead, content, image_url, caption, author, category_id,
         is_popular, tags, keywords, seo_meta_description, status, scheduled_at,
         allow_comments, show_on_homepage)
       values
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       returning id`,
      [
        slug,
        title,
        lead,
        JSON.stringify(content),
        image_url,
        caption,
        author,
        primaryCategoryId,
        is_popular,
        Array.isArray(tags) ? tags : [],
        keywords || null,
        seo_meta_description || null,
        status,
        scheduled_at,
        allow_comments,
        show_on_homepage
      ]
    );

    const newArticleId = insertResult.rows[0].id;
    await setArticleCategories(newArticleId, categoryIds);

    const fullResult = await pool.query(
      `${BASE_SELECT} where a.id = $1`,
      [newArticleId]
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

    // Kategori (bisa lebih dari satu) ditangani terpisah lewat
    // tabel relasi article_categories, bukan kolom biasa.
    let categoryIds = null; // null = tidak diubah
    if (updates.category_keys !== undefined) {
      categoryIds = await resolveCategoryIds(
        Array.isArray(updates.category_keys) ? updates.category_keys : []
      );
      updates.category_id = categoryIds[0] || null;
      delete updates.category_keys;
    } else if (updates.category_key !== undefined) {
      // Kompatibilitas lama: satu kategori saja
      categoryIds = await resolveCategoryIds(
        updates.category_key ? [updates.category_key] : []
      );
      updates.category_id = categoryIds[0] || null;
      delete updates.category_key;
    }

    if (updates.content) {
      updates.content = JSON.stringify(updates.content);
    }

    if (updates.tags && !Array.isArray(updates.tags)) {
      delete updates.tags;
    }

    const fields = Object.keys(updates);
    if (fields.length === 0 && categoryIds === null) {
      return res.status(400).json({ error: "Tidak ada data untuk diperbarui" });
    }

    let articleId;

    if (fields.length > 0) {
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
      articleId = updateResult.rows[0].id;
    } else {
      const existing = await pool.query(
        "select id from articles where slug = $1",
        [slug]
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: "Artikel tidak ditemukan" });
      }
      articleId = existing.rows[0].id;
    }

    if (categoryIds !== null) {
      await setArticleCategories(articleId, categoryIds);
    }

    const fullResult = await pool.query(
      `${BASE_SELECT} where a.id = $1`,
      [articleId]
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
