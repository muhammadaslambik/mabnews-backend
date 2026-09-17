const pool = require("../config/db");

/* =========================================================
   GET /api/categories
   ========================================================= */
async function getCategories(req, res) {
    try {
        const result = await pool.query(
            "select * from categories order by name asc"
        );

        res.json({ data: result.rows });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Gagal mengambil daftar kategori" });
    }
}


/* =========================================================
   POST /api/categories
   Body: { key, name, description }
   ========================================================= */
async function createCategory(req, res) {
    try {
        const { key, name, description } = req.body;

        if (!key || !name) {
            return res.status(400).json({
                error: "Key dan name wajib diisi"
            });
        }

        const result = await pool.query(
            `insert into categories (key, name, description)
             values ($1, $2, $3)
             returning *`,
            [key, name, description]
        );

        res.status(201).json({ data: result.rows[0] });

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

module.exports = {
    getCategories,
    createCategory
};
