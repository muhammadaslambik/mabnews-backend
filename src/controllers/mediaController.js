const pool = require("../config/db");

const FILE_TYPES = ["image", "video", "audio", "document", "file"];

/* =========================================================
   GET /api/media
   Query: type, q, limit (maks 500), page
   ========================================================= */
async function getMedia(req, res) {
  try {
    const { type, q } = req.query;
    const limitNum = Math.min(Number(req.query.limit) || 100, 500);
    const pageNum = Math.max(Number(req.query.page) || 1, 1);

    const conditions = [];
    const values = [];

    if (type && type !== "all" && FILE_TYPES.includes(type)) {
      values.push(type);
      conditions.push(`file_type = $${values.length}`);
    }
    if (q) {
      values.push(`%${q}%`);
      conditions.push(`name ilike $${values.length}`);
    }

    const whereClause = conditions.length ? `where ${conditions.join(" and ")}` : "";
    const listValues = [...values, limitNum, (pageNum - 1) * limitNum];

    const [listResult, countResult] = await Promise.all([
      pool.query(
        `select id, file_id, name, url, file_type, mime_type, size_bytes, folder, source, uploaded_by, created_at
         from media_files
         ${whereClause}
         order by created_at desc, id desc
         limit $${listValues.length - 1} offset $${listValues.length}`,
        listValues
      ),
      pool.query(`select count(*)::int as total from media_files ${whereClause}`, values)
    ]);

    res.json({ data: listResult.rows, total: countResult.rows[0].total });
  } catch (err) {
    console.error("getMedia error:", err);
    res.status(500).json({ error: "Gagal mengambil daftar media" });
  }
}

/* =========================================================
   POST /api/media
   Body: { file_id, name, url, file_type, mime_type, size_bytes,
           folder, source, uploaded_by }
   Idempoten: URL yang sama tidak dicatat dua kali.
   ========================================================= */
async function createMedia(req, res) {
  try {
    const {
      file_id = null,
      name,
      url,
      file_type = "file",
      mime_type = null,
      size_bytes = null,
      folder = null,
      source = "upload",
      uploaded_by = null
    } = req.body || {};

    if (!name || !url) {
      return res.status(400).json({ error: "Nama dan URL file wajib diisi" });
    }
    if (!/^https?:\/\//i.test(url)) {
      return res.status(400).json({ error: "URL file harus diawali http:// atau https://" });
    }

    const safeType = FILE_TYPES.includes(file_type) ? file_type : "file";
    const safeSize = Number.isFinite(Number(size_bytes)) ? Number(size_bytes) : null;
    const safeUploader = Number.isInteger(Number(uploaded_by)) ? Number(uploaded_by) : null;

    const result = await pool.query(
      `insert into media_files
         (file_id, name, url, file_type, mime_type, size_bytes, folder, source, uploaded_by)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       on conflict (url) do update set name = excluded.name
       returning id, file_id, name, url, file_type, mime_type, size_bytes, folder, source, uploaded_by, created_at`,
      [file_id, name, url, safeType, mime_type, safeSize, folder, source, safeUploader]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error("createMedia error:", err);
    res.status(500).json({ error: "Gagal mencatat file media" });
  }
}

module.exports = { getMedia, createMedia };
