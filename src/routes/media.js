const express = require("express");
const router = express.Router();

const { getMedia, createMedia } = require("../controllers/mediaController");

router.get("/", getMedia);
router.post("/", createMedia);

module.exports = router;
