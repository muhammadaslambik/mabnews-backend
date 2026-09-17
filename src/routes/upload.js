const express = require("express");
const router = express.Router();

const { getUploadAuth } = require("../controllers/uploadController");

router.get("/auth", getUploadAuth);

module.exports = router;
