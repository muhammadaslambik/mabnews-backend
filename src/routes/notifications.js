const express = require("express");
const router = express.Router();
const {
    getNotifications,
    createNotification,
    markNotificationRead,
    markAllNotificationsRead
} = require("../controllers/notificationsController");

router.get("/", getNotifications);
router.post("/", createNotification);
router.put("/:id/read", markNotificationRead);
router.post("/read-all", markAllNotificationsRead);

module.exports = router;
