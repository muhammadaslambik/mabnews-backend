const express = require("express");
const router = express.Router();
const {
  getAuthors,
  upsertAuthor,
  deleteAuthor
} = require("../controllers/authorsController");

router.get("/", getAuthors);
router.post("/", upsertAuthor);
router.delete("/:id", deleteAuthor);

module.exports = router;
