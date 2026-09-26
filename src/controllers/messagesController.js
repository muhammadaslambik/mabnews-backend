const pool = require("../config/db");

/* =========================================================
   GET /api/messages/conversations?user_id=1
   Daftar percakapan seorang pengguna: satu baris per lawan
   bicara, berisi pesan terakhir + jumlah belum dibaca.
========================================================= */
async function getConversations(req, res) {
    const userId = parseInt(req.query.user_id, 10);

    if (!userId) {
        return res.status(400).json({ error: "user_id wajib diisi" });
    }

    try {
        const result = await pool.query(
            `select
                other.id as user_id,
                coalesce(other.display_name, other.username) as name,
                last_message.body as last_body,
                last_message.created_at as last_created_at,
                last_message.sender_id as last_sender_id,
                (
                    select count(*)::int from messages m2
                    where m2.receiver_id = $1 and m2.sender_id = other.id and m2.is_read = false
                ) as unread_count
             from admin_users other
             join lateral (
                select body, created_at, sender_id
                from messages m
                where (m.sender_id = $1 and m.receiver_id = other.id)
                   or (m.sender_id = other.id and m.receiver_id = $1)
                order by m.created_at desc
                limit 1
             ) last_message on true
             where other.id != $1
             order by last_message.created_at desc`,
            [userId]
        );

        res.json({ data: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Gagal mengambil daftar percakapan" });
    }
}

/* =========================================================
   GET /api/messages/thread?user_id=1&with=2
   Semua pesan antara dua pengguna, urut waktu. Otomatis
   menandai pesan masuk sebagai sudah dibaca.
========================================================= */
async function getThread(req, res) {
    const userId = parseInt(req.query.user_id, 10);
    const withId = parseInt(req.query.with, 10);

    if (!userId || !withId) {
        return res.status(400).json({ error: "user_id dan with wajib diisi" });
    }

    try {
        const result = await pool.query(
            `select id, sender_id, receiver_id, body, is_read, created_at
             from messages
             where (sender_id = $1 and receiver_id = $2)
                or (sender_id = $2 and receiver_id = $1)
             order by created_at asc`,
            [userId, withId]
        );

        await pool.query(
            `update messages set is_read = true
             where sender_id = $1 and receiver_id = $2 and is_read = false`,
            [withId, userId]
        );

        res.json({ data: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Gagal mengambil percakapan" });
    }
}

/* =========================================================
   POST /api/messages
   Body: { sender_id, receiver_id, body }
========================================================= */
async function sendMessage(req, res) {
    const { sender_id, receiver_id, body } = req.body;

    if (!sender_id || !receiver_id || !body || !String(body).trim()) {
        return res.status(400).json({ error: "sender_id, receiver_id, dan body wajib diisi" });
    }

    if (Number(sender_id) === Number(receiver_id)) {
        return res.status(400).json({ error: "Tidak bisa mengirim pesan ke diri sendiri" });
    }

    try {
        const result = await pool.query(
            `insert into messages (sender_id, receiver_id, body)
             values ($1, $2, $3)
             returning *`,
            [sender_id, receiver_id, String(body).trim()]
        );
        res.status(201).json({ data: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Gagal mengirim pesan" });
    }
}

/* =========================================================
   GET /api/messages/unread-count?user_id=1
========================================================= */
async function getUnreadCount(req, res) {
    const userId = parseInt(req.query.user_id, 10);

    if (!userId) {
        return res.status(400).json({ error: "user_id wajib diisi" });
    }

    try {
        const result = await pool.query(
            "select count(*)::int as count from messages where receiver_id = $1 and is_read = false",
            [userId]
        );
        res.json({ data: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Gagal mengambil jumlah pesan belum dibaca" });
    }
}

module.exports = {
    getConversations,
    getThread,
    sendMessage,
    getUnreadCount
};
