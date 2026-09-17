const ImageKit = require("imagekit");
require("dotenv").config();

if (
    !process.env.IMAGEKIT_PUBLIC_KEY ||
    !process.env.IMAGEKIT_PRIVATE_KEY ||
    !process.env.IMAGEKIT_URL_ENDPOINT
) {
    console.warn(
        "[PERINGATAN] Konfigurasi ImageKit (PUBLIC_KEY/PRIVATE_KEY/URL_ENDPOINT) belum lengkap di file .env"
    );
}

const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

module.exports = imagekit;
