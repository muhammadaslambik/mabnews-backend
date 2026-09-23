const express = require("express");
const router = express.Router();
const {
    getSidebarMenu,
    saveSidebarMenu,
    resetSidebarMenu
} = require("../controllers/sidebarMenuController");

router.get("/", getSidebarMenu);
router.put("/", saveSidebarMenu);
router.post("/reset", resetSidebarMenu);

module.exports = router;
