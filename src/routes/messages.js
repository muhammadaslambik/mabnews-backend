const express = require("express");
const router = express.Router();
const {
    getConversations,
    getThread,
    sendMessage,
    getUnreadCount
} = require("../controllers/messagesController");

router.get("/conversations", getConversations);
router.get("/thread", getThread);
router.get("/unread-count", getUnreadCount);
router.post("/", sendMessage);

module.exports = router;
