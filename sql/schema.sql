-- =========================================================
-- MAB-NEWS — SKEMA DATABASE (PostgreSQL / Neon)
-- Jalankan file ini di Neon: Dashboard > Project Anda > SQL Editor > New query
-- Aman dijalankan berkali-kali (idempotent): pakai "if not exists"
-- dan "on conflict ... do nothing" di semua bagian.
-- =========================================================

-- =========================================================
-- TABEL: categories
-- =========================================================
create table if not exists categories (
    id serial primary key,
    key text unique not null,   -- contoh: 'nasional', 'ekonomi'
    name text not null,         -- contoh: 'Nasional', 'Ekonomi'
    description text,
    created_at timestamptz default now()
);

-- Isi data kategori awal (sesuai yang sudah dipakai di portal)
insert into categories (key, name) values
    ('nasional', 'Nasional'),
    ('internasional', 'Internasional'),
    ('ekonomi', 'Ekonomi'),
    ('metro', 'Metro'),
    ('dunia', 'Dunia'),
    ('olahraga', 'Olahraga'),
    ('teknologi', 'Teknologi'),
    ('otomotif', 'Otomotif'),
    ('gaya-hidup', 'Gaya Hidup'),
    ('seni', 'Seni'),
    ('kolom', 'Kolom'),
    ('indeks', 'Indeks'),
    ('foto', 'Foto'),
    ('video', 'Video')
on conflict (key) do nothing;

-- =========================================================
-- TABEL: articles
-- =========================================================
create table if not exists articles (
    id serial primary key,
    slug text unique not null,               -- contoh: 'pemerintah-siapkan-strategi-baru'
    title text not null,
    lead text,                               -- ringkasan/deskripsi singkat
    content jsonb not null default '[]',     -- array paragraf: ["paragraf 1", "paragraf 2", ...]
    image_url text,
    caption text,
    author text default 'MAB-News',
    category_id integer references categories(id) on delete set null,
    is_popular boolean default false,
    published_at timestamptz default now(),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_articles_category on articles(category_id);
create index if not exists idx_articles_slug on articles(slug);
create index if not exists idx_articles_published on articles(published_at desc);

-- Full-text search sederhana (judul + ringkasan)
create index if not exists idx_articles_search
on articles
using gin (to_tsvector('simple', title || ' ' || coalesce(lead, '')));

-- =========================================================
-- TABEL: admin_users (untuk login CMS nanti)
-- =========================================================
create table if not exists admin_users (
    id serial primary key,
    username text unique not null,
    password_hash text not null,
    created_at timestamptz default now()
);

-- =========================================================
-- TABEL: sidebar_menu
-- Menyimpan status aktif/nonaktif & urutan menu sidebar CMS
-- (halaman Pengaturan > Lainnya > Atur Sidebar).
--
-- type:
--   'main'  -> tampil langsung di level utama sidebar
--              (Dashboard, Artikel, Kategori, Media, Pengguna, Pengaturan)
--   'child' -> tampil di dalam grup "Lainnya"
--              (Laman, Statistik, Iklan, Perangkat, Domain & Hosting,
--               BackEnd & API, Atur Sidebar, Export & Impor)
-- =========================================================
create table if not exists sidebar_menu (
    id serial primary key,
    menu_key text unique not null,                 -- contoh: 'dashboard', 'atur-sidebar'
    label text not null,                            -- contoh: 'Dashboard', 'Atur Sidebar'
    icon text not null,                             -- nama class Font Awesome, contoh: 'fa-house'
    type text not null default 'main'
        check (type in ('main', 'child')),
    sort_order integer not null,
    is_active boolean not null default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_sidebar_menu_order on sidebar_menu(sort_order);

-- Isi data menu default (14 menu, sesuai tampilan awal Atur Sidebar)
insert into sidebar_menu (menu_key, label, icon, type, sort_order, is_active) values
    ('dashboard',      'Dashboard',        'fa-house',        'main',  1, true),
    ('artikel',        'Artikel',          'fa-file-lines',   'main',  2, true),
    ('kategori',       'Kategori',         'fa-folder',       'main',  3, true),
    ('media',          'Media',            'fa-image',        'main',  4, true),
    ('pengguna',       'Pengguna',         'fa-users',        'main',  5, true),
    ('pengaturan',     'Pengaturan',       'fa-gear',         'main',  6, true),
    ('laman',          'Laman',            'fa-file-lines',   'child', 7, true),
    ('statistik',      'Statistik',        'fa-chart-column', 'child', 8, true),
    ('iklan',          'Iklan',            'fa-bullhorn',     'child', 9, true),
    ('perangkat',      'Perangkat',        'fa-display',      'child', 10, true),
    ('domain-hosting', 'Domain & Hosting', 'fa-globe',        'child', 11, true),
    ('backend-api',    'BackEnd & API',    'fa-code',         'child', 12, true),
    ('atur-sidebar',   'Atur Sidebar',     'fa-table-cells',  'child', 13, true),
    ('export-impor',   'Export & Impor',   'fa-file-export',  'child', 14, true)
on conflict (menu_key) do nothing;

-- =========================================================
-- TRIGGER: otomatis update kolom updated_at
-- =========================================================
create or replace function set_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists trg_articles_updated_at on articles;
create trigger trg_articles_updated_at
before update on articles
for each row
execute function set_updated_at();

drop trigger if exists trg_sidebar_menu_updated_at on sidebar_menu;
create trigger trg_sidebar_menu_updated_at
before update on sidebar_menu
for each row
execute function set_updated_at();
