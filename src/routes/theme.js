const express = require("express");
const router = express.Router();

const { getTheme, saveTheme } = require("../controllers/themeController");

router.get("/", getTheme);
router.put("/", saveTheme);

module.exports = router;
