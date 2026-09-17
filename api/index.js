const serverless = require("serverless-http");
const app = require("../server");

/*
 * Vercel menjalankan backend ini sebagai "serverless function" —
 * bukan server yang menyala terus-menerus, tapi function yang
 * hidup sesaat setiap kali ada request masuk, lalu "istirahat"
 * lagi setelahnya. Ini yang membuatnya tidak pernah butuh proses
 * restore/resume manual seperti database yang di-pause.
 */
module.exports = serverless(app);
