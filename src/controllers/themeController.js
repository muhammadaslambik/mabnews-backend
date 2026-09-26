const pool = require("../config/db");

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const DEFAULTS = { sidebar_color: "#03142f", header_color: "#03142e" };

/* =========================================================
   GET /api/theme
   ========================================================= */
async function getTheme(req, res) {
  try {
    const result = await pool.query(
      "select sidebar_color, header_color from cms_theme where id = 1"
    );
    res.json({ data: result.rows[0] || DEFAULTS });
  } catch (err) {
    console.error("getTheme error:", err);
    res.status(500).json({ error: "Gagal mengambil pengaturan warna" });
  }
}

/* =========================================================
   PUT /api/theme
   Body: { sidebar_color, header_color } — kode hex 6 digit
   ========================================================= */
async function saveTheme(req, res) {
  try {
    const { sidebar_color, header_color } = req.body || {};

    if (!HEX_RE.test(sidebar_color || "") || !HEX_RE.test(header_color || "")) {
      return res.status(400).json({ error: "Format warna harus kode hex 6 digit, contoh #03142f" });
    }

    const result = await pool.query(
      `insert into cms_theme (id, sidebar_color, header_color, updated_at)
       values (1, $1, $2, now())
       on conflict (id) do update set
         sidebar_color = excluded.sidebar_color,
         header_color = excluded.header_color,
         updated_at = now()
       returning sidebar_color, header_color`,
      [sidebar_color, header_color]
    );

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error("saveTheme error:", err);
    res.status(500).json({ error: "Gagal menyimpan pengaturan warna" });
  }
}

module.exports = { getTheme, saveTheme };
