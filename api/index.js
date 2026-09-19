console.log("=== api/index.js MULAI DIEKSEKUSI ===");

const serverless = require("serverless-http");
console.log("=== serverless-http berhasil di-require ===");

const app = require("../server");
console.log("=== ../server (Express app) berhasil di-require ===");

const handler = serverless(app);
console.log("=== handler serverless berhasil dibuat ===");

module.exports = async (req, res) => {
  console.log("=== handler DIPANGGIL untuk:", req.method, req.url, "===");
  await handler(req, res);
  console.log("=== handler SELESAI untuk:", req.method, req.url, "===");
};