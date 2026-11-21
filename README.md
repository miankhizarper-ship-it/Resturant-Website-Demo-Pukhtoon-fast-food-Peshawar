# MoviesMod Scraper (Node.js → Cloudflare Worker ready)

moviesmod.fi ke liye dependency-free scraper. Pehle **localhost** par test hota hai
(saved HTML fixtures ke saath, bina internet ke), phir same code **Cloudflare Worker**
par deploy ke liye ready hai — koi Node-only API use nahi hui.

## Routes / API

| Endpoint | Description |
|---|---|
| `GET /` | Index page (endpoint list) |
| `GET /api/home?page=1` | Homepage listing (cards + pagination) |
| `GET /api/search?q=one&page=1` | Search results — `https://moviesmod.fi/search/one` |
| `GET /api/explore?path=/movies/hollywood/&page=1` | Explore/category listing |
| `GET /api/detail?id=<slug>` | Detail page — id = base ke baad ka slug, e.g. `download-the-one-about-matthew-perry-season-1-hindi-720p-1080p` |
| `GET /api/detail?id=<slug>&source=1` | Detail + uske saare modpro source pages (episode links) |
| `GET /api/source?url=<modpro url>` | `episodes.modpro.blog` / `links.modpro.blog` page ke download links |
| `GET /api/generate?url=<thenaukriadda url>` | Hop-chain follow karke **final download URL** nikalta hai |

Har response JSON hai: listing me `items[]` (`title`, `url`, `slug`, `image`),
detail me `buttons[]`, `downloadGroups[]`, `imdb`, `related`, aur generate me
`downloadUrl` + `hops[]` (step-by-step trace).

## Download flow (source files se samjha gaya)

```
moviesmod.fi/<slug>/                      (detail page)
  └─ maxbutton "Episode Links" / "Batch"   → episodes.modpro.blog/archives/<id>
       └─ "Episode N" / server buttons      → en.thenaukriadda.in/?sid=<b64>
            └─ POST _lp_http2/_lp_token/_lp_chain/_lp_hop_index (timer page)
                 └─ … hops …               → final file URL (drive.google.com etc.)
```

Single-file posts (`links.modpro.blog/archives/<id>`) seedhi server buttons dete hain
(Fast Server, G-Direct → gdrivepro.xyz, OneDrive, Other → urlflix.xyz).

## Localhost testing

```bash
npm test          # 19 offline tests (saved fixtures par)
npm run dev       # mock fixtures (9081) + API (8787) ek saath
```

`npm run dev` ke baad:

```bash
curl "http://127.0.0.1:8787/api/home"
curl "http://127.0.0.1:8787/api/search?q=one"
curl "http://127.0.0.1:8787/api/explore?path=/movies/hollywood/"
curl "http://127.0.0.1:8787/api/detail?id=download-the-blue-road-season-1-hindi-480p-720p-1080p"
curl "http://127.0.0.1:8787/api/source?url=https://episodes.modpro.blog/archives/136380"
curl "http://127.0.0.1:8787/api/generate?url=https://en.thenaukriadda.in/?sid=..."
```

### Live mode (real site ke against)

Mock band karke direct moviesmod.fi par:

```bash
npm start         # SCRAPER_MOCK_ORIGIN unset → live fetch
# ya:
SCRAPER_MOCK_ORIGIN= npm start
```

> Note: hop timer (10s) client-side hai; server likely enforce nahi karta.
> Agar zaroorat ho to `SCRAPER_HOP_WAIT=10 npm start` se beech me wait ho jayega.
> `SCRAPER_MAX_HOPS` (default 8) se chain length control hoti hai.

## Cloudflare Worker deploy (agle step)

Code already Worker-compatible hai (sirf `fetch`, `Request`, `Response`):

```bash
npm i -D wrangler
npx wrangler deploy
```

`wrangler.toml` included hai. Deploy ke baad routes wahi honge:
`https://moviesmod-scraper.<account>.workers.dev/api/home` etc.
`SCRAPER_MOCK_ORIGIN` Worker me mat set karna (live mode chalega).

## Structure

```
src/
  config.js          base URLs, origin-mapping (mock mode), SSRF allow-list
  scraper.js         fetch + orchestration (home/search/explore/detail/source/generate)
  router.js          shared request router (local + worker dono use karte hain)
  server.js          Node HTTP server (localhost)
  worker.js          Cloudflare Worker entry
  parser/
    html.js          entity decode, strip tags, attr extraction
    listing.js       home/search/explore cards + pagination
    detail.js        title, categories, imdb, download buttons, related
    source.js        modpro episodes/servers links
    hop.js           thenaukriadda form (lp-s1-form) + final-link detection
mock/
  route.js, server.js   fixture replays (no internet needed)
test/
  fixtures/*.html       saved page sources (original site se)
  parsers.test.js       unit tests
  e2e.test.js           full API tests against mock
scripts/dev.js          mock + API ek saath
```
