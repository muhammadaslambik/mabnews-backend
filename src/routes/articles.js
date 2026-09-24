const express = require("express");
const router = express.Router();
const {
  getArticles,
  getArticleBySlug,
  createArticle,
  updateArticle,
  deleteArticle
} = require("../controllers/articlesController");
const {
  getComments,
  createComment
} = require("../controllers/commentsController");   

router.get("/", getArticles);
router.post("/", createArticle);
router.get("/:slug", getArticleBySlug);
router.put("/:slug", updateArticle);
router.delete("/:slug", deleteArticle);

router.get("/:slug/comments", getComments); 
router.post("/:slug/comments", createComment);   

module.exports = router;