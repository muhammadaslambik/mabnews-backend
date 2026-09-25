const pool = require("../config/db");
const bcrypt = require("bcryptjs");

const ALLOWED_ROLES = ["Administrator", "Editor", "Penulis", "Kontributor"];
const ALLOWED_STATUS = ["Aktif", "Tidak Aktif"];

// Kolom yang aman dikirim ke frontend — password_hash TIDAK PERNAH ikut.
const SAFE_COLUMNS = "id, username, name, email, role, status, avatar_url, last_active_at, created_at";

/* =========================================================
   GET /api/users
   Query: q, role, status, limit, page
   ========================================================= */
async function getUsers(req, res) {
  try {
    const { q, role, status, limit = 10, page = 1 } = req.query;

    const conditions = [];
    const values = [];

    if (role && role !== "all") {
      values.push(role);
      conditions.push(`role = $${values.length}`);
    }
    if (status && status !== "all") {
      values.push(status);
      conditions.push(`status = $${values.length}`);
    }
    if (q) {
      values.push(`%${q}%`);
      conditions.push(`(name ilike $${values.length} or email ilike $${values.length} or username ilike $${values.length})`);
    }

    const whereClause = conditions.length ? `where ${conditions.join(" and ")}` : "";

    const limitNum = Number(limit) || 10;
    const pageNum = Number(page) || 1;
    const offsetNum = (pageNum - 1) * limitNum;

    const listValues = [...values, limitNum, offsetNum];
    const limitPlaceholder = `$${listValues.length - 1}`;
    const offsetPlaceholder = `$${listValues.length}`;

    const listQuery = `
      select ${SAFE_COLUMNS}
      from admin_users
      ${whereClause}
      order by last_active_at desc nulls last, created_at desc
      limit ${limitPlaceholder}
      offset ${offsetPlaceholder}
    `;
    const countQuery = `select count(*)::int as total from admin_users ${whereClause}`;

    const [listResult, countResult] = await Promise.all([
      pool.query(listQuery, listValues),
      pool.query(countQuery, values)
    ]);

    res.json({ data: listResult.rows, total: countResult.rows[0].total });
  } catch (err) {
    console.error("getUsers error:", err);
    res.status(500).json({ error: "Gagal mengambil daftar pengguna" });
  }
}

/* =========================================================
   POST /api/users
   Body: { username, name, email, password, role, status }
   ========================================================= */
async function createUser(req, res) {
  try {
    const { username, name, email, password, role = "Penulis", status = "Aktif" } = req.body || {};

    if (!username || !name || !email || !password) {
      return res.status(400).json({ error: "Username, nama, email, dan password wajib diisi" });
    }
    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ error: "Peran tidak valid" });
    }
    if (!ALLOWED_STATUS.includes(status)) {
      return res.status(400).json({ error: "Status tidak valid" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: "Password minimal 6 karakter" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `insert into admin_users (username, name, email, password_hash, role, status, last_active_at)
       values ($1, $2, $3, $4, $5, $6, now())
       returning ${SAFE_COLUMNS}`,
      [username, name, email, passwordHash, role, status]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error("createUser error:", err);
    if (err.code === "23505") {
      return res.status(409).json({ error: "Username atau email sudah dipakai" });
    }
    res.status(500).json({ error: "Gagal membuat pengguna" });
  }
}

/* =========================================================
   PUT /api/users/:id  (partial update)
   Body: name?, email?, role?, status?, username?, password?
   ========================================================= */
async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const allowedFields = ["username", "name", "email", "role", "status", "avatar_url"];
    const updates = {};

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) updates[field] = body[field];
    });

    if (updates.role && !ALLOWED_ROLES.includes(updates.role)) {
      return res.status(400).json({ error: "Peran tidak valid" });
    }
    if (updates.status && !ALLOWED_STATUS.includes(updates.status)) {
      return res.status(400).json({ error: "Status tidak valid" });
    }

    if (body.password) {
      if (String(body.password).length < 6) {
        return res.status(400).json({ error: "Password minimal 6 karakter" });
      }
      updates.password_hash = await bcrypt.hash(body.password, 10);
    }

    // Menganggap setiap perubahan data sebagai aktivitas terbaru,
    // sampai sistem login sungguhan terpasang dan mengisi kolom
    // ini otomatis setiap kali pengguna login.
    updates.last_active_at = new Date();

    const fields = Object.keys(updates);
    if (fields.length === 0) {
      return res.status(400).json({ error: "Tidak ada data untuk diperbarui" });
    }

    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(", ");
    const values = fields.map((field) => updates[field]);
    values.push(id);

    const result = await pool.query(
      `update admin_users set ${setClause} where id = $${values.length} returning ${SAFE_COLUMNS}`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pengguna tidak ditemukan" });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error("updateUser error:", err);
    if (err.code === "23505") {
      return res.status(409).json({ error: "Username atau email sudah dipakai" });
    }
    res.status(500).json({ error: "Gagal memperbarui pengguna" });
  }
}

/* =========================================================
   DELETE /api/users/:id
   ========================================================= */
async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query("delete from admin_users where id = $1 returning id", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pengguna tidak ditemukan" });
    }
    res.json({ message: "Pengguna berhasil dihapus" });
  } catch (err) {
    console.error("deleteUser error:", err);
    res.status(500).json({ error: "Gagal menghapus pengguna" });
  }
}

module.exports = { getUsers, createUser, updateUser, deleteUser };
