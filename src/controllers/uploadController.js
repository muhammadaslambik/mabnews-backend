const imagekit = require("../config/imagekit");

/*
 * Pola upload yang dipakai di sini: CMS/browser meminta "tanda
 * tangan" (signature) sekali pakai dari backend ini, lalu
 * meng-upload gambar LANGSUNG dari browser ke ImageKit — bukan
 * lewat server kita.
 *
 * Kenapa begini, bukan upload lewat server kita dulu:
 * 1. Lebih cepat — file tidak perlu "mampir" dulu ke server kita.
 * 2. Lebih aman — private key ImageKit tidak pernah dikirim ke
 *    browser, cuma dipakai untuk membuat signature di sini.
 * 3. Ramah untuk hosting serverless (Vercel/Netlify) yang punya
 *    batas ukuran request kecil untuk setiap function.
 */
function getUploadAuth(req, res) {
    try {
        const authParams = imagekit.getAuthenticationParameters();
        res.json(authParams);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Gagal membuat otorisasi upload" });
    }
}

module.exports = {
    getUploadAuth
};
