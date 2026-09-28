-- =========================================================
-- MIGRASI: Notifikasi & Pesan antar pengguna CMS
-- Jalankan SEKALI di Neon SQL Editor.
-- Aman dijalankan berkali-kali (idempotent).
-- =========================================================

-- =========================================================
-- 1) TAMBAH display_name di admin_users
--    (supaya pesan/notifikasi bisa menampilkan nama asli,
--    bukan cuma username)
-- =========================================================
alter table admin_users
    add column if not exists display_name text;

update admin_users
set display_name = username
where display_name is null;

-- =========================================================
-- 2) SEED 2 CONTOH USER (biar langsung bisa dites kirim pesan)
--    GANTI password_hash ini kalau kamu pakai akun ini
--    sungguhan nanti — nilainya cuma placeholder, BUKAN hash
--    beneran, jangan dipakai untuk login produksi.
-- =========================================================
insert into admin_users (username, password_hash, display_name) values
    ('aslam',   'CHANGE_ME_PLACEHOLDER_HASH', 'Muhammad Aslambik'),
    ('editor1', 'CHANGE_ME_PLACEHOLDER_HASH', 'Editor Satu')
on conflict (username) do nothing;

-- =========================================================
-- 3) TABEL notifications
-- =========================================================
create table if not exists notifications (
    id serial primary key,
    type text not null default 'system',   -- 'system' | 'article' | 'message' | dst
    title text not null,
    message text,
    link text,                             -- halaman tujuan kalau notifikasi diklik
    is_read boolean not null default false,
    created_at timestamptz default now()
);

create index if not exists idx_notifications_created on notifications(created_at desc);

-- =========================================================
-- 4) TABEL messages (pesan antar pengguna CMS)
-- =========================================================
create table if not exists messages (
    id serial primary key,
    sender_id integer not null references admin_users(id) on delete cascade,
    receiver_id integer not null references admin_users(id) on delete cascade,
    body text not null,
    is_read boolean not null default false,
    created_at timestamptz default now()
);

create index if not exists idx_messages_sender on messages(sender_id);
create index if not exists idx_messages_receiver on messages(receiver_id);
create index if not exists idx_messages_created on messages(created_at);
