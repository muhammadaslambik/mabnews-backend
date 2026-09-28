-- =========================================================
-- MIGRASI: dukung grup "Artikel" + rapikan ulang urutan sidebar_menu
-- Jalankan file ini SEKALI di Neon SQL Editor.
-- Migrasi TAMBAHAN (bukan pengganti file sebelumnya).
-- Aman dijalankan berkali-kali (idempotent).
-- =========================================================

-- 1) Izinkan nilai 'artikel' di kolom parent_group
alter table sidebar_menu
    drop constraint if exists sidebar_menu_parent_group_check;

alter table sidebar_menu
    add constraint sidebar_menu_parent_group_check
    check (parent_group is null or parent_group in ('lainnya', 'pengaturan', 'artikel'));

-- 2) Tambahkan 3 menu baru untuk grup "Artikel"
--    (sort_order sementara di sini, akan dirapikan lagi di langkah 3)
insert into sidebar_menu (menu_key, label, icon, type, parent_group, sort_order, is_active) values
    ('semua-artikel',  'Semua Artikel',  'fa-list',     'child', 'artikel', 3, true),
    ('tambah-artikel', 'Tambah Artikel', 'fa-plus',     'child', 'artikel', 4, true),
    ('draft',          'Draft',          'fa-file-pen', 'child', 'artikel', 5, true)
on conflict (menu_key) do nothing;

-- 3) RAPIKAN ULANG seluruh nomor urutan (1..24) supaya mengikuti
--    urutan tampilan sidebar sungguhan dari atas ke bawah, tanpa
--    lompat-lompat. Ini menimpa sort_order SEMUA baris yang ada,
--    termasuk yang sudah pernah kamu ubah manual sebelumnya.
update sidebar_menu set sort_order = v.new_order
from (values
    ('dashboard',       1),
    ('artikel',         2),
    ('semua-artikel',   3),
    ('tambah-artikel',  4),
    ('draft',           5),
    ('kategori',        6),
    ('media',           7),
    ('pengguna',        8),
    ('pengaturan',      9),
    ('umum',            10),
    ('website',         11),
    ('tampilan',        12),
    ('seo',             13),
    ('email',           14),
    ('backup',          15),
    ('keamanan',        16),
    ('laman',           17),
    ('statistik',       18),
    ('iklan',           19),
    ('perangkat',       20),
    ('domain-hosting',  21),
    ('backend-api',     22),
    ('atur-sidebar',    23),
    ('export-impor',    24)
) as v(menu_key, new_order)
where sidebar_menu.menu_key = v.menu_key;

-- 4) Cek hasilnya (opsional, cuma untuk lihat urutan akhir)
-- select menu_key, label, type, parent_group, sort_order, is_active
-- from sidebar_menu
-- order by sort_order;
