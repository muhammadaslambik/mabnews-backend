-- =========================================================
-- MAB-NEWS — SKEMA DATABASE (Neon / PostgreSQL)
-- Jalankan file ini di Neon: Dashboard > SQL Editor > New query
--
-- File ini sudah menggabungkan seluruh migrasi tambahan
-- (sql/002_cms_connect.sql, 003_comments_homepage.sql,
-- 004_multi_category.sql). Aman dijalankan di database yang
-- sudah ada isinya (pakai IF NOT EXISTS di semua bagian) maupun
-- di database baru yang masih kosong.
-- =========================================================

-- =========================================================
-- TABEL: categories
-- =========================================================
create table if not exists categories (
  id serial primary key,
  key text unique not null,         -- contoh: 'nasional', 'ekonomi'
  name text not null,                -- contoh: 'Nasional', 'Ekonomi'
  description text,
  status text default 'Aktif',       -- 'Aktif' | 'Nonaktif'
  created_at timestamptz default now()
);

alter table categories
  add column if not exists status text default 'Aktif';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'categories_status_check'
  ) then
    alter table categories
      add constraint categories_status_check
      check (status in ('Aktif', 'Nonaktif'));
  end if;
end $$;

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
  slug text unique not null,          -- contoh: 'pemerintah-siapkan-strategi-baru'
  title text not null,
  lead text,                           -- ringkasan/deskripsi singkat
  content jsonb not null default '[]', -- array paragraf: ["paragraf 1", "paragraf 2", ...]
  image_url text,
  caption text,
  author text default 'MAB-News',
  category_id integer references categories(id) on delete set null, -- kategori utama (lihat article_categories untuk kategori lengkap)
  is_popular boolean default false,
  tags text[] default '{}',
  seo_meta_description text,
  keywords text,
  status text default 'published',     -- 'published' | 'draft' | 'scheduled'
  scheduled_at timestamptz,
  allow_comments boolean default true,
  show_on_homepage boolean default true,
  published_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Kolom tambahan untuk database yang sudah ada isinya sebelum kolom ini dibuat
alter table articles
  add column if not exists tags text[] default '{}',
  add column if not exists seo_meta_description text,
  add column if not exists keywords text,
  add column if not exists status text default 'published',
  add column if not exists scheduled_at timestamptz,
  add column if not exists allow_comments boolean default true,
  add column if not exists show_on_homepage boolean default true;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'articles_status_check'
  ) then
    alter table articles
      add constraint articles_status_check
      check (status in ('published', 'draft', 'scheduled'));
  end if;
end $$;

update articles set status = 'published' where status is null;
update articles set allow_comments = true where allow_comments is null;
update articles set show_on_homepage = true where show_on_homepage is null;

create index if not exists idx_articles_category on articles(category_id);
create index if not exists idx_articles_slug on articles(slug);
create index if not exists idx_articles_published on articles(published_at desc);
create index if not exists idx_articles_status on articles(status);

-- Full-text search sederhana (judul + ringkasan)
create index if not exists idx_articles_search
  on articles
  using gin (to_tsvector('simple', title || ' ' || coalesce(lead, '')));

-- =========================================================
-- TABEL: article_categories (relasi many-to-many)
-- Satu artikel bisa masuk ke beberapa kategori sekaligus.
-- Kategori pertama yang dipilih tetap disalin ke articles.category_id
-- sebagai "kategori utama" untuk kompatibilitas mundur.
-- =========================================================
create table if not exists article_categories (
  article_id integer not null references articles(id) on delete cascade,
  category_id integer not null references categories(id) on delete cascade,
  primary key (article_id, category_id)
);

create index if not exists idx_article_categories_category
  on article_categories(category_id);
create index if not exists idx_article_categories_article
  on article_categories(article_id);

-- Pindahkan kategori tunggal yang sudah ada (articles.category_id, kalau ada)
-- ke tabel relasi ini, supaya artikel lama tidak kehilangan kategorinya.
insert into article_categories (article_id, category_id)
select id, category_id from articles
where category_id is not null
on conflict do nothing;

-- =========================================================
-- TABEL: admin_users (untuk login CMS nanti)
-- =========================================================
create table if not exists admin_users (
  id serial primary key,
  username text unique not null,
  password_hash text not null,
  created_at timestamptz default now()
);

-- Kolom tambahan untuk halaman "Pengguna" di CMS (nama, email,
-- peran, status, dan waktu terakhir aktif). Aman dijalankan
-- ulang di database yang sudah ada isinya (pakai IF NOT EXISTS).
alter table admin_users
  add column if not exists name text,
  add column if not exists email text,
  add column if not exists role text default 'Penulis',
  add column if not exists status text default 'Aktif',
  add column if not exists last_active_at timestamptz default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'admin_users_email_key'
  ) then
    alter table admin_users add constraint admin_users_email_key unique (email);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'admin_users_role_check'
  ) then
    alter table admin_users
      add constraint admin_users_role_check
      check (role in ('Administrator', 'Editor', 'Penulis', 'Kontributor'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'admin_users_status_check'
  ) then
    alter table admin_users
      add constraint admin_users_status_check
      check (status in ('Aktif', 'Tidak Aktif'));
  end if;
end $$;

create index if not exists idx_admin_users_role on admin_users(role);
create index if not exists idx_admin_users_status on admin_users(status);

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
