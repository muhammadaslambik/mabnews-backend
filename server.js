require("dotenv").config();
const express = require("express");
const cors = require("cors");

const articlesRoutes = require("./src/routes/articles");
const categoriesRoutes = require("./src/routes/categories");
const uploadRoutes = require("./src/routes/upload");
const sidebarMenuRoutes = require("./src/routes/sidebarMenu");
const notificationsRoutes = require("./src/routes/notifications");
const usersRoutes = require("./src/routes/users");
const messagesRoutes = require("./src/routes/messages");

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN || "*"
}));
app.use(express.json());

/* =========================================================
   ROUTES
========================================================= */
app.get("/", (req, res) => {
    res.json({
        message: "MAB-News API aktif",
        endpoints: [
            "GET /api/articles",
            "GET /api/articles/:slug",
            "POST /api/articles",
            "PUT /api/articles/:slug",
            "DELETE /api/articles/:slug",
            "GET /api/categories",
            "POST /api/categories",
            "PUT /api/categories/:id",
            "DELETE /api/categories/:id",
            "GET /api/upload/auth",
            "GET /api/sidebar-menu",
            "PUT /api/sidebar-menu",
            "POST /api/sidebar-menu/reset",
            "GET /api/notifications",
            "POST /api/notifications",
            "PUT /api/notifications/:id/read",
            "POST /api/notifications/read-all",
            "GET /api/users",
            "GET /api/messages/conversations",
            "GET /api/messages/thread",
            "GET /api/messages/unread-count",
            "POST /api/messages"
        ]
    });
});

app.use("/api/articles", articlesRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/sidebar-menu", sidebarMenuRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/messages", messagesRoutes);

/* =========================================================
   404 & ERROR HANDLER
========================================================= */
app.use((req, res) => {
    res.status(404).json({ error: "Endpoint tidak ditemukan" });
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: "Terjadi kesalahan pada server" });
});

/*
 * Kalau dijalankan langsung di komputer sendiri (npm run dev),
 * nyalakan server seperti biasa.
 *
 * Kalau di-deploy ke Vercel, file ini TIDAK dijalankan langsung —
 * Vercel akan mengimpor `app`-nya lewat api/index.js (lihat file
 * itu) dan menjalankannya sebagai serverless function, sehingga
 * app.listen() di bawah ini otomatis dilewati.
 */
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`MAB-News API berjalan di http://localhost:${PORT}`);
    });
}

module.exports = app;
