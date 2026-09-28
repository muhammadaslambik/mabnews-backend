-- =========================================================
-- MIGRASI: dukung grup "Pengaturan" di sidebar_menu
-- Jalankan file ini SEKALI di Neon SQL Editor.
-- Ini migrasi TAMBAHAN, bukan pengganti schema.sql sebelumnya —
-- JANGAN jalankan ulang schema.sql yang lama, cukup file ini saja.
-- Aman dijalankan berkali-kali (idempotent).
-- =========================================================

-- 1) Tambah kolom parent_group.
--    null       -> item ini tampil di level utama sidebar (main)
--    'lainnya'  -> item ini anak dari grup "Lainnya"
--    'pengaturan' -> item ini anak dari grup "Pengaturan"
alter table sidebar_menu
    add column if not exists parent_group text;

-- 2) Tandai 8 item "Lainnya" yang sudah ada sebagai parent_group = 'lainnya'
--    (item-item ini sebelumnya cuma ditandai type='child' tanpa keterangan
--    dia anak dari grup mana).
update sidebar_menu
set parent_group = 'lainnya'
where type = 'child' and parent_group is null;

-- 3) Pasang batasan nilai yang boleh diisi di parent_group
alter table sidebar_menu
    drop constraint if exists sidebar_menu_parent_group_check;

alter table sidebar_menu
    add constraint sidebar_menu_parent_group_check
    check (parent_group is null or parent_group in ('lainnya', 'pengaturan'));

-- 4) Tambahkan 7 menu baru untuk grup "Pengaturan"
insert into sidebar_menu (menu_key, label, icon, type, parent_group, sort_order, is_active) values
    ('umum',      'Umum',      'fa-sliders',            'child', 'pengaturan', 15, true),
    ('website',   'Website',   'fa-globe',              'child', 'pengaturan', 16, true),
    ('tampilan',  'Tampilan',  'fa-palette',            'child', 'pengaturan', 17, true),
    ('seo',       'SEO',       'fa-magnifying-glass',   'child', 'pengaturan', 18, true),
    ('email',     'Email',     'fa-envelope',           'child', 'pengaturan', 19, true),
    ('backup',    'Backup',    'fa-database',           'child', 'pengaturan', 20, true),
    ('keamanan',  'Keamanan',  'fa-shield-halved',      'child', 'pengaturan', 21, true)
on conflict (menu_key) do nothing;
