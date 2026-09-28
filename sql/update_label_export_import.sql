-- =========================================================
-- Ganti label menu "Export & Impor" -> "Export & Import"
-- Jalankan sekali di Neon SQL Editor.
-- =========================================================

update sidebar_menu
set label = 'Export & Import'
where menu_key = 'export-impor';
