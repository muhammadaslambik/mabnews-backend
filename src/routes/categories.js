const express = require("express");
const router = express.Router();

const {
    getCategories,
    createCategory,
    updateCategory,   // <-- Sudah ditambahkan
    deleteCategory    // <-- Sudah ditambahkan
} = require("../controllers/categoriesController");

router.get("/", getCategories);
router.post("/", createCategory);
router.put("/:id", updateCategory);      // <-- Sudah ditambahkan
router.delete("/:id", deleteCategory);   // <-- Sudah ditambahkan

module.exports = router;
