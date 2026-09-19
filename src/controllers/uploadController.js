console.log("=== uploadController.js MULAI DIMUAT ===");

const imagekit = require("../config/imagekit");

console.log("=== uploadController.js: config imagekit berhasil di-require ===");

exports.getUploadAuth = (req, res) => {
  console.log("=== getUploadAuth DIPANGGIL ===");
  try {
    const result = imagekit.getAuthenticationParameters();
    console.log("=== getUploadAuth: parameter berhasil dibuat, mengirim response ===");
    res.json(result);
    console.log("=== getUploadAuth: res.json() SUDAH dipanggil ===");
  } catch (err) {
    console.error("=== getUploadAuth ERROR ===", err);
    res.status(500).json({ error: "Gagal membuat parameter upload" });
  }
};

console.log("=== uploadController.js SELESAI DIMUAT ===");