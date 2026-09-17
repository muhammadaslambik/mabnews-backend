const express = require("express");
const router = express.Router();

const {
    getArticles,
    getArticleBySlug,
    createArticle,
    updateArticle,
    deleteArticle
} = require("../controllers/articlesController");

router.get("/", getArticles);
router.get("/:slug", getArticleBySlug);
router.post("/", createArticle);
router.put("/:slug", updateArticle);
router.delete("/:slug", deleteArticle);

module.exports = router;
