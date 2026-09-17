-- =========================================================
-- MAB-NEWS — SKEMA DATABASE (Supabase / PostgreSQL)
-- Jalankan file ini di Supabase: Dashboard > SQL Editor > New query
-- =========================================================

-- =========================================================
-- TABEL: categories
-- =========================================================
create table if not exists categories (
    id          serial primary key,
    key         text unique not null,   -- contoh: 'nasional', 'ekonomi'
    name        text not null,          -- contoh: 'Nasional', 'Ekonomi'
    description text,
    created_at  timestamptz default now()
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
    id            serial primary key,
    slug          text unique not null,       -- contoh: 'pemerintah-siapkan-strategi-baru'
    title         text not null,
    lead          text,                       -- ringkasan/deskripsi singkat
    content       jsonb not null default '[]', -- array paragraf: ["paragraf 1", "paragraf 2", ...]
    image_url     text,
    caption       text,
    author        text default 'MAB-News',
    category_id   integer references categories(id) on delete set null,
    is_popular    boolean default false,
    published_at  timestamptz default now(),
    created_at    timestamptz default now(),
    updated_at    timestamptz default now()
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
    id            serial primary key,
    username      text unique not null,
    password_hash text not null,
    created_at    timestamptz default now()
);


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
