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
| `explore.php?path=/movies/hollywood/` | Category listing + chips |
| `detail.php?id=slug` | Detail page + **download flow** |
| `api.php` | JSON proxy to the scraper worker (with cache) |
| `404.php` | Custom not-found page |

## Download flow

```
detail.php buttons (Episode Links / Batch / Server)
  └─► GET api.php?endpoint=source&url=https://episodes.modpro.blog/archives/…
       └─► user picks episode/server
            └─► GET api.php?endpoint=generate&url=https://en.thenaukriadda.in/?sid=…
                 └─► final direct download URL (Download now / Copy)
```

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

## Configuration

`config.php`:

```php
API_BASE      // scraper worker URL
CACHE_TTL     // seconds of static cache (0 = off)
NAV_CATEGORIES// navbar explore links
```

Local override without editing the file:

```bash
MOVIA_API=http://127.0.0.1:8787 php -S localhost:8080
```

## Project structure

```
movia/
├── index.php  search.php  explore.php  detail.php
├── api.php  404.php  config.php
├── includes/
│   ├── functions.php   # API client + cache + rendering helpers
│   ├── header.php      # <head> + navbar (live search)
│   └── footer.php      # footer + scripts
├── assets/
│   ├── css/  bootstrap.min.css, bootstrap-icons.min.css, style.css
│   ├── js/   bootstrap.bundle.min.js, app.js
│   └── fonts/ inter-latin-wght-normal.woff2, bootstrap-icons.woff2
├── cache/               # optional JSON cache (writable)
└── .htaccess            # InfinityFree/Apache config
```
