const pool = require("../config/db");

/* =========================================================
   DATA DEFAULT — dipakai oleh endpoint reset.
   Harus sinkron dengan sql/migration_*.sql dan dengan
   DEFAULT_MENUS di admin-js/atur-sidebar.js (frontend).

   parent_group:
     null          -> tampil di level utama sidebar (main)
     'artikel'     -> anak dari grup "Artikel"
     'pengaturan'  -> anak dari grup "Pengaturan"
     'lainnya'     -> anak dari grup "Lainnya"

   sort_order dibuat berurutan (1..24) mengikuti posisi tampil
   sungguhan di sidebar, dari atas ke bawah, termasuk anak menu
   yang langsung mengikuti nomor induknya.
========================================================= */
const DEFAULT_MENUS = [
    { menu_key: "dashboard", label: "Dashboard", icon: "fa-house", type: "main", parent_group: null, sort_order: 1, is_active: true },
    { menu_key: "artikel", label: "Artikel", icon: "fa-file-lines", type: "main", parent_group: null, sort_order: 2, is_active: true },
    { menu_key: "semua-artikel", label: "Semua Artikel", icon: "fa-list", type: "child", parent_group: "artikel", sort_order: 3, is_active: true },
    { menu_key: "tambah-artikel", label: "Tambah Artikel", icon: "fa-plus", type: "child", parent_group: "artikel", sort_order: 4, is_active: true },
    { menu_key: "draft", label: "Draft", icon: "fa-file-pen", type: "child", parent_group: "artikel", sort_order: 5, is_active: true },

    { menu_key: "kategori", label: "Kategori", icon: "fa-folder", type: "main", parent_group: null, sort_order: 6, is_active: true },
    { menu_key: "media", label: "Media", icon: "fa-image", type: "main", parent_group: null, sort_order: 7, is_active: true },
    { menu_key: "pengguna", label: "Pengguna", icon: "fa-users", type: "main", parent_group: null, sort_order: 8, is_active: true },
    { menu_key: "pengaturan", label: "Pengaturan", icon: "fa-gear", type: "main", parent_group: null, sort_order: 9, is_active: true },

    { menu_key: "umum", label: "Umum", icon: "fa-sliders", type: "child", parent_group: "pengaturan", sort_order: 10, is_active: true },
    { menu_key: "website", label: "Website", icon: "fa-globe", type: "child", parent_group: "pengaturan", sort_order: 11, is_active: true },
    { menu_key: "tampilan", label: "Tampilan", icon: "fa-palette", type: "child", parent_group: "pengaturan", sort_order: 12, is_active: true },
    { menu_key: "seo", label: "SEO", icon: "fa-magnifying-glass", type: "child", parent_group: "pengaturan", sort_order: 13, is_active: true },
    { menu_key: "email", label: "Email", icon: "fa-envelope", type: "child", parent_group: "pengaturan", sort_order: 14, is_active: true },
    { menu_key: "backup", label: "Backup", icon: "fa-database", type: "child", parent_group: "pengaturan", sort_order: 15, is_active: true },
    { menu_key: "keamanan", label: "Keamanan", icon: "fa-shield-halved", type: "child", parent_group: "pengaturan", sort_order: 16, is_active: true },

    { menu_key: "laman", label: "Laman", icon: "fa-file-lines", type: "child", parent_group: "lainnya", sort_order: 17, is_active: true },
    { menu_key: "statistik", label: "Statistik", icon: "fa-chart-column", type: "child", parent_group: "lainnya", sort_order: 18, is_active: true },
    { menu_key: "iklan", label: "Iklan", icon: "fa-bullhorn", type: "child", parent_group: "lainnya", sort_order: 19, is_active: true },
    { menu_key: "perangkat", label: "Perangkat", icon: "fa-display", type: "child", parent_group: "lainnya", sort_order: 20, is_active: true },
    { menu_key: "domain-hosting", label: "Domain & Hosting", icon: "fa-globe", type: "child", parent_group: "lainnya", sort_order: 21, is_active: true },
    { menu_key: "backend-api", label: "BackEnd & API", icon: "fa-code", type: "child", parent_group: "lainnya", sort_order: 22, is_active: true },
    { menu_key: "atur-sidebar", label: "Atur Sidebar", icon: "fa-table-cells", type: "child", parent_group: "lainnya", sort_order: 23, is_active: true },
    { menu_key: "export-impor", label: "Export & Import", icon: "fa-file-export", type: "child", parent_group: "lainnya", sort_order: 24, is_active: true }
];

/*
 * Query select selalu memakai alias supaya bentuk JSON yang
 * dikirim ke frontend tetap { id, label, icon, type, parentGroup, order, active }
 * meskipun nama kolom asli di database beda gaya penamaan.
 */
const SELECT_QUERY = `
    select
        menu_key as id,
        label,
        icon,
        type,
        parent_group as "parentGroup",
        sort_order as "order",
        is_active as active
    from sidebar_menu
    order by sort_order asc
`;

/* =========================================================
   GET /api/sidebar-menu
========================================================= */
async function getSidebarMenu(req, res) {
    try {
        const result = await pool.query(SELECT_QUERY);
        res.json({ data: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Gagal mengambil pengaturan sidebar" });
    }
}

/* =========================================================
   PUT /api/sidebar-menu
   Body: { menus: [{ id, label, icon, type, parentGroup, order, active }, ...] }
========================================================= */
async function saveSidebarMenu(req, res) {
    const { menus } = req.body;

    if (!Array.isArray(menus) || menus.length === 0) {
        return res.status(400).json({ error: "Data menus wajib berupa array dan tidak boleh kosong" });
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        for (const menu of menus) {
            const { id, label, icon, type, parentGroup, order, active } = menu;

            if (!id || !label || !icon || typeof order !== "number") {
                throw new Error(`Data menu tidak lengkap untuk id: ${id || "(tanpa id)"}`);
            }

            await client.query(
                `insert into sidebar_menu (menu_key, label, icon, type, parent_group, sort_order, is_active)
                 values ($1, $2, $3, $4, $5, $6, $7)
                 on conflict (menu_key) do update set
                    label = excluded.label,
                    icon = excluded.icon,
                    type = excluded.type,
                    parent_group = excluded.parent_group,
                    sort_order = excluded.sort_order,
                    is_active = excluded.is_active`,
                [id, label, icon, type || "main", parentGroup || null, order, Boolean(active)]
            );
        }

        await client.query("COMMIT");

        const result = await client.query(SELECT_QUERY);
        res.json({ data: result.rows });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error(err);
        res.status(500).json({ error: "Gagal menyimpan pengaturan sidebar" });
    } finally {
        client.release();
    }
}

/* =========================================================
   POST /api/sidebar-menu/reset
========================================================= */
async function resetSidebarMenu(req, res) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        for (const menu of DEFAULT_MENUS) {
            await client.query(
                `insert into sidebar_menu (menu_key, label, icon, type, parent_group, sort_order, is_active)
                 values ($1, $2, $3, $4, $5, $6, $7)
                 on conflict (menu_key) do update set
                    label = excluded.label,
                    icon = excluded.icon,
                    type = excluded.type,
                    parent_group = excluded.parent_group,
                    sort_order = excluded.sort_order,
                    is_active = excluded.is_active`,
                [menu.menu_key, menu.label, menu.icon, menu.type, menu.parent_group, menu.sort_order, menu.is_active]
            );
        }

        await client.query("COMMIT");

        const result = await client.query(SELECT_QUERY);
        res.json({ data: result.rows });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error(err);
        res.status(500).json({ error: "Gagal mereset pengaturan sidebar" });
    } finally {
        client.release();
    }
}

module.exports = {
    getSidebarMenu,
    saveSidebarMenu,
    resetSidebarMenu
};
