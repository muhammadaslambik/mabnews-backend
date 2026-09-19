console.log("=== api/index.js MULAI DIEKSEKUSI ===");

const app = require("../server");

module.exports = (req, res) => {
  console.log("=== handler DIPANGGIL untuk:", req.method, req.url, "===");
  app(req, res);
};