require("dotenv").config();

const express = require("express");
const cors = require("cors");

const articlesRoutes = require("./src/routes/articles");
const categoriesRoutes = require("./src/routes/categories");
const uploadRoutes = require("./src/routes/upload");

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
            "GET  /api/articles",
            "GET  /api/articles/:slug",
            "POST /api/articles",
            "PUT  /api/articles/:slug",
            "DELETE /api/articles/:slug",
            "GET  /api/categories",
            "POST /api/categories",
            "GET  /api/upload/auth"
        ]
    });
});

app.use("/api/articles", articlesRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/upload", uploadRoutes);


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
