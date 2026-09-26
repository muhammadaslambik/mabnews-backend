const pool = require("../config/db");

/* =========================================================
   GET /api/notifications
========================================================= */
async function getNotifications(req, res) {
    try {
        const result = await pool.query(
            `select id, type, title, message, link, is_read, created_at
             from notifications
             order by created_at desc
             limit 30`
        );
        res.json({ data: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Gagal mengambil notifikasi" });
    }
}

/* =========================================================
   POST /api/notifications
   Body: { type, title, message, link }
   Dipakai untuk mencatat notifikasi baru (dipanggil otomatis
   misalnya saat artikel baru dibuat).
========================================================= */
async function createNotification(req, res) {
    const { type, title, message, link } = req.body;

    if (!title) {
        return res.status(400).json({ error: "title wajib diisi" });
    }

    try {
        const result = await pool.query(
            `insert into notifications (type, title, message, link)
             values ($1, $2, $3, $4)
             returning *`,
            [type || "system", title, message || null, link || null]
        );
        res.status(201).json({ data: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Gagal membuat notifikasi" });
    }
}

/* =========================================================
   PUT /api/notifications/:id/read
========================================================= */
async function markNotificationRead(req, res) {
    const { id } = req.params;

    try {
        await pool.query("update notifications set is_read = true where id = $1", [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Gagal menandai notifikasi" });
    }
}

/* =========================================================
   POST /api/notifications/read-all
========================================================= */
async function markAllNotificationsRead(req, res) {
    try {
        await pool.query("update notifications set is_read = true where is_read = false");
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Gagal menandai semua notifikasi" });
    }
}

module.exports = {
    getNotifications,
    createNotification,
    markNotificationRead,
    markAllNotificationsRead
};
