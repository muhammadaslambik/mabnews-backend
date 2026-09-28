-- =========================================================
-- MIGRASI (OPSIONAL): rapikan id serial sidebar_menu
-- supaya urut 1..24 sesuai sort_order.
--
-- CATATAN:
-- - id serial TIDAK dipakai oleh aplikasi (backend & frontend
--   selalu memakai menu_key sebagai penanda). Migrasi ini murni
--   kerapian visual di Neon, tidak wajib dan tidak memengaruhi
--   fungsi apa pun.
-- - Aman dijalankan karena tidak ada tabel lain yang
--   mereferensikan sidebar_menu.id.
-- - PERINGATAN: ini akan mengosongkan lalu mengisi ulang semua
--   baris. Kalau ada perubahan status aktif/urutan yang sudah
--   kamu simpan lewat halaman Atur Sidebar dan belum sempat
--   dicatat di sini, itu akan HILANG dan kembali ke default di
--   bawah ini. Kalau kamu mau menyimpan susunan yang SEDANG aktif
--   sekarang, beri tahu saya dulu sebelum menjalankan ini.
-- =========================================================

truncate table sidebar_menu restart identity;

insert into sidebar_menu (menu_key, label, icon, type, parent_group, sort_order, is_active) values
    ('dashboard',       'Dashboard',        'fa-house',            'main',  null,          1,  true),
    ('artikel',         'Artikel',          'fa-file-lines',       'main',  null,          2,  true),
    ('semua-artikel',   'Semua Artikel',    'fa-list',             'child', 'artikel',     3,  true),
    ('tambah-artikel',  'Tambah Artikel',   'fa-plus',             'child', 'artikel',     4,  true),
    ('draft',           'Draft',            'fa-file-pen',         'child', 'artikel',     5,  true),
    ('kategori',        'Kategori',         'fa-folder',           'main',  null,          6,  true),
    ('media',           'Media',            'fa-image',            'main',  null,          7,  true),
    ('pengguna',        'Pengguna',         'fa-users',            'main',  null,          8,  true),
    ('pengaturan',      'Pengaturan',       'fa-gear',             'main',  null,          9,  true),
    ('umum',            'Umum',             'fa-sliders',          'child', 'pengaturan', 10,  true),
    ('website',         'Website',          'fa-globe',            'child', 'pengaturan', 11,  true),
    ('tampilan',        'Tampilan',         'fa-palette',          'child', 'pengaturan', 12,  true),
    ('seo',             'SEO',              'fa-magnifying-glass', 'child', 'pengaturan', 13,  true),
    ('email',           'Email',            'fa-envelope',         'child', 'pengaturan', 14,  true),
    ('backup',          'Backup',           'fa-database',         'child', 'pengaturan', 15,  true),
    ('keamanan',        'Keamanan',         'fa-shield-halved',    'child', 'pengaturan', 16,  true),
    ('laman',           'Laman',            'fa-file-lines',       'child', 'lainnya',    17,  true),
    ('statistik',       'Statistik',        'fa-chart-column',     'child', 'lainnya',    18,  true),
    ('iklan',           'Iklan',            'fa-bullhorn',         'child', 'lainnya',    19,  true),
    ('perangkat',       'Perangkat',        'fa-display',          'child', 'lainnya',    20,  true),
    ('domain-hosting',  'Domain & Hosting', 'fa-globe',            'child', 'lainnya',    21,  true),
    ('backend-api',     'BackEnd & API',    'fa-code',             'child', 'lainnya',    22,  true),
    ('atur-sidebar',    'Atur Sidebar',     'fa-table-cells',      'child', 'lainnya',    23,  true),
    ('export-impor',    'Export & Impor',   'fa-file-export',      'child', 'lainnya',    24,  true);

-- Cek hasilnya (opsional)
-- select id, menu_key, label, type, parent_group, sort_order
-- from sidebar_menu
-- order by id;
