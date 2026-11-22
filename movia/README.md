# Movia 🎬

Modern, responsive movie/series website (HTML + CSS + JS + PHP) powered by the
**MoviesMod Scraper API** (`https://moviesmod-scraper.mkode.workers.dev`).

- **Framework:** Bootstrap 5.3 (vendored, no CDN needed) + custom dark-cinema theme
- **Icons:** Bootstrap Icons (vendored)
- **Font:** Inter variable (vendored)
- **PHP:** 7.4+ / 8.x — no Composer, no database
- **Ready for:** InfinityFree (or any shared PHP host)

## Pages

| File | Purpose |
|---|---|
| `index.php` | Home — hero + latest movies + "Load more" |
| `search.php?q=…` | Search results (server-rendered) |
| `explore.php?path=/movies/hollywood/` | Category listing + chips + collapsible filters |
| `detail.php?id=slug` | Detail page + download links (plain redirects to source) |
| `about.php` | About Movia |
| `privacy.php` | Privacy policy |
| `terms.php` | Terms of use |
| `api.php` | JSON proxy to the scraper worker (with cache) |
| `debug.php` | Connectivity diagnostics (open when pages show errors) |
| `404.php` | Custom not-found page |

## Download flow

Download buttons on the detail page are **plain links** (`<a href="…">`) to the
source "get link" page. Clicking one redirects the visitor there, where they
pick the episode/server themselves — Movia never scrapes or generates the final
link. The old `endpoint=source` / `endpoint=generate` AJAX flow was removed;
`api.php` now serves `home | search | explore | detail` only.

## Run locally

```bash
# Point at the live worker (default) — just needs PHP:
php -S localhost:8080

# Or point at a local scraper instance:
MOVIA_API=http://127.0.0.1:8787 php -S localhost:8080
```

Open http://localhost:8080

## Deploy on InfinityFree (step by step)

1. **Sign up** at [infinityfree.com](https://www.infinityfree.com) → get a free account.
2. From the client area create a **hosting account** (choose PHP 8.x, no MySQL needed).
3. Open **Online File Manager** (or use FTP with the credentials shown in the panel).
4. Zip the **contents** of this `movia/` folder (so `index.php` is at the zip root),
   upload the zip into `htdocs/`, right-click → **Extract**.
5. Delete the zip after extracting.
6. Visit your site — done! (Propagation can take a few minutes.)

### Notes for InfinityFree
- PHP runs out of the box; `curl` or `allow_url_fopen` both handled by `includes/functions.php`.
- `cache/` must stay writable (default `0755`); if not writable, caching silently disables.
- The API URL lives in `config.php` — change it there if your worker URL changes.
- Free-tier worker limits apply (the scraper returns `429` when rate-limited; the UI shows a friendly retry).

## Troubleshooting: "Could not reach the server"

If pages render but every request shows *"Could not reach the server. Please try
again in a moment."*, the **host's PHP** couldn't fetch the worker (outbound
block, DNS, SSL, or no curl/fopen). Two things help:

1. **Open `https://your-site/debug.php`** — it shows exactly which step fails
   (DNS, cURL, `allow_url_fopen`, SSL, live `/api/home` test, cache writability)
   plus the raw transport error. If it says *SSL certificate problem*, set
   `define('API_SSL_VERIFY', false);` in `config.php`.

2. **The site still works without server-side fetching.** Every page detects the
   failure and the **browser calls the worker directly** (the worker sends
   `Access-Control-Allow-Origin: *`), rendering the same content client-side —
   grids, detail pages, search suggestions, and download links.
   Error banners include a collapsible **Technical details** block with the
   raw cause, so you can paste it into a support ticket.

The fallback order is: `api.php` (server proxy, cached) → worker direct from
the visitor's browser. Validation errors (400) and worker answers (404/429)
are never retried, so the free-tier rate limit isn't double-spent.

## Configuration

`config.php`:

```php
API_BASE        // scraper worker URL
CACHE_TTL       // seconds of static cache (0 = off)
NAV_CATEGORIES  // navbar explore links
EXPLORE_FILTERS // collapsible filter groups on the explore page
```

Local override without editing the file:

```bash
MOVIA_API=http://127.0.0.1:8787 php -S localhost:8080
```

## Project structure

```
movia/
├── index.php  search.php  explore.php  detail.php
├── about.php  privacy.php  terms.php
├── api.php  404.php  config.php
├── includes/
│   ├── functions.php   # API client + cache + rendering + logo helper
│   ├── header.php      # <head> + splash + navbar (live search)
│   └── footer.php      # footer + scripts
├── assets/
│   ├── css/  bootstrap.min.css, bootstrap-icons.min.css, style.css
│   ├── js/   bootstrap.bundle.min.js, app.js
│   └── fonts/ inter-latin-wght-normal.woff2, bootstrap-icons.woff2
├── cache/               # optional JSON cache (writable)
└── .htaccess            # InfinityFree/Apache config
```
