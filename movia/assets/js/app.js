/* ==========================================================================
   Movia — front-end app
   - live search suggestions
   - detail download buttons: plain links to the source ("get link") page
   - load-more grid paging
   - server-error fallback: if api.php (PHP -> worker) fails, the browser
     calls the worker directly (worker sends CORS: *) and renders the page
   - toasts
   ========================================================================== */
(function () {
  'use strict';

  var API = (window.MOVIA_API || '').replace(/\/+$/, '');

  /* ---------------- helpers ---------------- */

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function toast(message, type) {
    var host = $('#toastHost');
    if (!host) return;
    var bg = type === 'error' ? 'bg-danger-subtle' : (type === 'success' ? 'bg-success-subtle' : 'bg-dark-subtle');
    var el = document.createElement('div');
    el.className = 'toast align-items-center ' + bg + ' border-0';
    el.setAttribute('role', 'alert');
    el.innerHTML =
      '<div class="d-flex"><div class="toast-body">' + esc(message) + '</div>' +
      '<button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>';
    host.appendChild(el);
    var t = new bootstrap.Toast(el, { delay: 3500 });
    t.show();
    el.addEventListener('hidden.bs.toast', function () { el.remove(); });
  }

  /** moviesmod category URL -> internal explore path. */
  function catPath(url) {
    if (!url) return '/movies/';
    try { return new URL(url, 'https://moviesmod.fi/').pathname || '/movies/'; }
    catch (e) { return '/movies/'; }
  }

  /* ---------------- network: proxy first, worker direct as fallback -------- */

  /**
   * Fetch JSON from a URL.
   * @param {string} url
   * @param {number} timeoutMs
   * @param {AbortSignal} [extSignal] caller cancellation (never triggers fallback)
   * Throws Error with .status / .name ('AbortError' only when caller cancelled).
   */
  function fetchJson(url, timeoutMs, extSignal) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, timeoutMs || 30000);
    var onExtAbort = function () { controller.abort(); };
    if (extSignal) {
      if (extSignal.aborted) controller.abort();
      else extSignal.addEventListener('abort', onExtAbort);
    }
    return fetch(url, { signal: controller.signal, headers: { 'Accept': 'application/json' } })
      .then(function (res) {
        return res.text().catch(function () { return ''; }).then(function (text) {
          var data = null;
          try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
          if (!data || (data.error && res.status >= 400)) {
            var msg = data && data.error ? data.error : ('Request failed (' + res.status + ')');
            var err = new Error(msg);
            err.status = res.status;
            err.detail = data && data.detail;
            throw err;
          }
          return data;
        });
      })
      .catch(function (e) {
        if (e.name === 'AbortError') {
          if (extSignal && extSignal.aborted) throw e;          // caller cancelled
          var te = new Error('Request timed out. Please try again.');
          te.name = 'TimeoutError';
          throw te;
        }
        throw e;
      })
      .finally(function () {
        clearTimeout(timer);
        if (extSignal) extSignal.removeEventListener('abort', onExtAbort);
      });
  }

  /**
   * Call the API with graceful fallback:
   *   1) api.php (server-side proxy; works when PHP can reach the worker)
   *   2) worker directly from the browser (CORS: *; works when the host
   *      blocks PHP outbound but the visitor's browser is fine)
   */
  async function callApi(endpoint, params, timeoutMs, signal) {
    params = Object.assign({}, params || {});
    var lastErr = null;

    // 1) server proxy
    try {
      var qs = new URLSearchParams(Object.assign({ endpoint: endpoint }, params)).toString();
      return await fetchJson('api.php?' + qs, timeoutMs, signal);
    } catch (e) {
      if (e.name === 'AbortError') throw e;           // user cancelled — don't retry
      // Only retry when the proxy itself looks broken (validation errors and
      // relayed worker answers like 404/429 are final — retrying would just
      // double-hit the free-tier rate limit).
      var st = e.status;
      var retriable = e.name === 'TimeoutError' || st === undefined ||
        st >= 500 || (st >= 200 && st < 300);         // 2xx here = unparseable body
      if (!retriable) throw e;
      lastErr = e;
    }

    // 2) direct worker call from the browser
    if (API) {
      try {
        var dqs = new URLSearchParams(params).toString();
        return await fetchJson(API + '/api/' + endpoint + (dqs ? '?' + dqs : ''), timeoutMs, signal);
      } catch (e2) {
        if (e2.name === 'AbortError') throw e2;
        // Both paths failed — surface both causes (helps debug hosts that
        // block PHP outbound traffic while the browser is fine).
        if (lastErr) {
          var both = new Error(e2.message + ' | proxy: ' + lastErr.message);
          both.detail = e2.detail || lastErr.detail;
          both.status = e2.status || lastErr.status;
          throw both;
        }
        throw e2;
      }
    }
    throw lastErr || new Error('API not configured.');
  }

  function cardHtml(item) {
    var slug = item.slug || '';
    var title = item.title || '';
    var img = item.image || '';
    var href = 'detail.php?id=' + encodeURIComponent(slug);
    var poster = img
      ? '<img src="' + esc(img) + '" alt="' + esc(title) + '" loading="lazy" decoding="async">'
      : '<div class="poster-fallback"><i class="bi bi-film"></i></div>';
    var meta = item.date
      ? '<p class="card-meta"><i class="bi bi-calendar3"></i> ' + esc(item.date) + '</p>' : '';
    return '<div class="col">' +
      '<a class="movie-card h-100" href="' + href + '">' +
      '<div class="poster">' + poster +
      '<div class="poster-overlay"><span class="view-btn"><i class="bi bi-play-fill"></i> View</span></div>' +
      '</div>' +
      '<div class="card-body"><h3 class="card-title" title="' + esc(title) + '">' + esc(title) + '</h3>' + meta + '</div>' +
      '</a></div>';
  }

  var GRID_CLASS = 'row row-cols-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-5 g-3 g-md-4';

  /* ---------------- live search suggestions ---------------- */

  (function initSuggest() {
    var input = $('#navSearchInput');
    var box = $('#searchSuggest');
    if (!input || !box) return;

    var timer = null, lastQ = '', abort = null;

    function hide() { box.classList.remove('show'); box.innerHTML = ''; }

    input.addEventListener('input', function () {
      var q = input.value.trim();
      clearTimeout(timer);
      if (abort) abort.abort();
      if (q.length < 2) { hide(); return; }
      timer = setTimeout(async function () {
        if (q === lastQ) return;
        lastQ = q;
        abort = new AbortController();
        try {
          var data = await callApi('search', { q: q, page: 1 }, 15000, abort.signal);
          var items = (data && data.items) ? data.items.slice(0, 6) : [];
          if (input.value.trim() !== q) return; // stale
          if (!items.length) { hide(); return; }
          box.innerHTML = items.map(function (it) {
            var img = it.image
              ? '<img src="' + esc(it.image) + '" alt="" loading="lazy">'
              : '<span class="suggest-fallback"></span>';
            return '<button type="button" class="suggest-item" data-slug="' + esc(it.slug || '') + '">' +
              img + '<span class="s-title">' + esc(it.title || '') + '</span></button>';
          }).join('');
          box.classList.add('show');
        } catch (e) { /* ignore suggestion errors */ }
      }, 280);
    });

    box.addEventListener('click', function (ev) {
      var btn = ev.target.closest('.suggest-item');
      if (!btn) return;
      var slug = btn.getAttribute('data-slug');
      if (slug) window.location.href = 'detail.php?id=' + encodeURIComponent(slug);
    });

    document.addEventListener('click', function (ev) {
      if (!box.contains(ev.target) && ev.target !== input) hide();
    });
    input.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') hide(); });
  })();

  /* ---------------- load more (server-rendered home grid) ---------------- */

  (function initLoadMore() {
    var wrap = $('#loadMoreWrap');
    var btn = $('#loadMoreBtn');
    var grid = $('#gridHome');
    if (!wrap || !btn || !grid) return;

    // Show the button only if pagination has a next page server-side
    var pager = $('#pagerHome');
    var hasNext = pager && pager.querySelector('a.page-link[href*="page="]');
    // If server pagination rendered next links, keep pager; still offer load-more
    wrap.hidden = false;

    btn.addEventListener('click', async function () {
      var page = parseInt(btn.dataset.nextPage, 10) || 2;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Loading…';
      try {
        var data = await callApi('home', { page: page }, 30000);
        var items = (data && data.items) ? data.items : [];
        if (!items.length) {
          wrap.innerHTML = '<p class="text-muted">No more items.</p>';
          return;
        }
        var frag = document.createElement('div');
        frag.innerHTML = '<div class="' + GRID_CLASS + '">' + items.map(cardHtml).join('') + '</div>';
        var newRow = frag.firstElementChild;
        // append cards into existing grid rows
        var existingRow = grid.querySelector('.row');
        if (existingRow) {
          Array.prototype.forEach.call(newRow.children, function (col) {
            existingRow.appendChild(col);
          });
        } else {
          grid.appendChild(newRow);
        }

        var next = (data.pagination && data.pagination.next) ? page + 1 : null;
        if (next) {
          btn.dataset.nextPage = next;
          btn.disabled = false;
          btn.innerHTML = '<i class="bi bi-plus-circle me-1"></i> Load more';
        } else {
          wrap.innerHTML = '<p class="text-muted mb-0"><i class="bi bi-check2-circle me-1"></i>You have reached the end.</p>';
          if (pager) pager.hidden = true;
        }
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-plus-circle me-1"></i> Load more';
        toast(err.message, 'error');
      }
    });
  })();

  /* ---------------- browser-direct fallback renderer -----------------------
     PHP rendered an error because its outbound fetch failed. The browser
     calls the worker itself and renders the content client-side. */

  function hideServerErrorUi() {
    $$('.js-fallback-hide').forEach(function (el) { el.remove(); });
  }

  function renderFallbackGrid(host, data, endpoint, params) {
    var items = (data && data.items) ? data.items : [];
    if (!items.length) {
      host.innerHTML =
        '<div class="empty-state glass"><i class="bi bi-inbox"></i>' +
        '<p>No results found.</p></div>';
      return;
    }
    var page = parseInt(params.page, 10) || 1;
    var hasNext = !!(data.pagination && data.pagination.next);
    host.innerHTML =
      '<div class="fb-grid"><div class="' + GRID_CLASS + '">' + items.map(cardHtml).join('') + '</div></div>' +
      (hasNext
        ? '<div class="text-center mt-4"><button type="button" class="btn btn-accent btn-lg" data-fb-more>' +
          '<i class="bi bi-plus-circle me-1"></i> Load more</button></div>'
        : '');

    var moreBtn = host.querySelector('[data-fb-more]');
    if (!moreBtn) return;
    moreBtn.addEventListener('click', async function () {
      var next = page + 1;
      moreBtn.disabled = true;
      moreBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Loading…';
      try {
        var np = Object.assign({}, params, { page: next });
        var d2 = await callApi(endpoint, np, 30000);
        var more = (d2 && d2.items) ? d2.items : [];
        if (!more.length) {
          moreBtn.parentElement.innerHTML = '<p class="text-muted">No more items.</p>';
          return;
        }
        var row = host.querySelector('.fb-grid .row');
        if (row) {
          var frag = document.createElement('div');
          frag.innerHTML = more.map(cardHtml).join('');
          Array.prototype.forEach.call(frag.children, function (col) { row.appendChild(col); });
        }
        page = next;
        if (d2.pagination && d2.pagination.next) {
          moreBtn.disabled = false;
          moreBtn.innerHTML = '<i class="bi bi-plus-circle me-1"></i> Load more';
        } else {
          moreBtn.parentElement.innerHTML =
            '<p class="text-muted mb-0"><i class="bi bi-check2-circle me-1"></i>You have reached the end.</p>';
        }
      } catch (err) {
        moreBtn.disabled = false;
        moreBtn.innerHTML = '<i class="bi bi-plus-circle me-1"></i> Load more';
        toast(err.message, 'error');
      }
    });
  }

  function detailHtml(d) {
    var imdb = d.imdb || {};
    var poster = imdb.poster || (d.related && d.related[0] && d.related[0].image) || '';
    var posterHtml = poster
      ? '<img src="' + esc(poster) + '" alt="' + esc(d.title || '') + '" class="img-fluid">'
      : '<div class="poster-fallback big"><i class="bi bi-film"></i></div>';
    var rating = imdb.rating
      ? '<div class="rating-badge" title="IMDb rating"><i class="bi bi-star-fill"></i> ' + esc(imdb.rating) + '</div>'
      : '';
    var date = d.date
      ? '<p class="detail-meta"><i class="bi bi-calendar3 me-1"></i>' + esc(d.date) + '</p>' : '';
    var chips = (d.categories || []).length
      ? '<div class="chip-row mb-3">' + d.categories.map(function (c) {
          return '<a class="chip" href="explore.php?path=' + encodeURIComponent(catPath(c.url)) + '">' +
            esc(c.name) + '</a>';
        }).join('') + '</div>'
      : '';

    var imdbBox = '';
    if (imdb.title || imdb.ratingText) {
      imdbBox =
        '<div class="imdb-box glass mb-3"><div class="row g-3 align-items-center">' +
        '<div class="col-auto">' + (imdb.poster
          ? '<img src="' + esc(imdb.poster) + '" alt="" class="imdb-thumb rounded">' : '') + '</div>' +
        '<div class="col"><h5 class="mb-1">' + esc(imdb.title || '') +
        (imdb.year ? ' <span class="text-muted">(' + esc(imdb.year) + ')</span>' : '') +
        (imdb.imdbUrl
          ? ' <a class="ms-2 small" href="' + esc(imdb.imdbUrl) + '" target="_blank" rel="noopener nofollow">' +
            '<i class="bi bi-box-arrow-up-right"></i> IMDb</a>' : '') +
        '</h5>' +
        (imdb.genres || imdb.released
          ? '<p class="small text-muted mb-1">' + esc(imdb.genres || '') +
            (imdb.released ? ' &bull; ' + esc(imdb.released) : '') + '</p>' : '') +
        (imdb.ratingText
          ? '<p class="small mb-1"><i class="bi bi-star-fill text-warning me-1"></i>' + esc(imdb.ratingText) + '</p>' : '') +
        (imdb.teaser ? '<p class="small mb-1">' + esc(imdb.teaser) + '</p>' : '') +
        ((imdb.director || imdb.actors)
          ? '<p class="small text-muted mb-0">' +
            (imdb.director ? '<strong>Director:</strong> ' + esc(imdb.director) + '<br>' : '') +
            (imdb.actors ? '<strong>Cast:</strong> ' + esc(imdb.actors) : '') + '</p>' : '') +
        '</div></div></div>';
    }

    var desc = d.description
      ? '<div class="detail-desc glass p-3 mb-3"><p class="mb-0">' + esc(d.description) + '</p></div>' : '';

    var groups = d.downloadGroups || [];
    var dlPanel =
      '<div class="download-panel glass p-3 p-md-4" id="downloadPanel">' +
      '<h2 class="h5 mb-1"><i class="bi bi-download text-accent me-1"></i>Download</h2>' +
      '<p class="text-muted small mb-3">Choose a quality — you\'ll be taken to the download page to get your link.</p>';
    if (!groups.length) {
      dlPanel += '<div class="alert alert-warning mb-0"><i class="bi bi-exclamation-circle me-2"></i>' +
        'No download buttons found on this page.</div>';
    } else {
      groups.forEach(function (g, gi) {
        dlPanel += '<div class="dl-group mb-3" data-group="' + gi + '">';
        if (g.quality) {
          dlPanel += '<div class="dl-quality"><i class="bi bi-hd-circle me-1"></i>' + esc(g.quality) + '</div>';
        }
        dlPanel += '<div class="dl-buttons">';
        (g.buttons || []).forEach(function (b) {
          if (b.disabled) {
            dlPanel += '<button class="btn btn-dl" disabled title="Currently unavailable">' +
              '<i class="bi bi-lock me-1"></i>' + esc(b.label || 'Link') + '</button>';
          } else if (b.url) {
            dlPanel += '<a class="btn btn-dl" href="' + esc(b.url) + '" target="_blank" rel="nofollow noopener noreferrer">' +
              '<i class="bi bi-download me-1"></i>' + esc(b.label || 'Link') + '</a>';
          }
        });
        dlPanel += '</div></div>';
      });
    }
    dlPanel += '</div>';

    var crumbCat = (d.categories && d.categories[0]) ? d.categories[0] : null;
    var crumbs =
      '<nav aria-label="breadcrumb" class="mb-3"><ol class="breadcrumb glass-crumb">' +
      '<li class="breadcrumb-item"><a href="index.php"><i class="bi bi-house-door me-1"></i>Home</a></li>' +
      (crumbCat
        ? '<li class="breadcrumb-item"><a href="explore.php?path=' +
          encodeURIComponent(catPath(crumbCat.url)) + '">' + esc(crumbCat.name) + '</a></li>'
        : '') +
      '<li class="breadcrumb-item active" aria-current="page">Details</li></ol></nav>';

    var related = (d.related && d.related.length)
      ? '<div class="section-head mt-5"><h2 class="h4"><i class="bi bi-collection-play text-accent me-2"></i>Related</h2></div>' +
        '<div class="' + GRID_CLASS + '">' + d.related.map(cardHtml).join('') + '</div>'
      : '';

    return crumbs +
      '<div class="row g-4 detail-top">' +
      '<div class="col-md-4 col-lg-3"><div class="detail-poster glass">' + posterHtml + rating + '</div></div>' +
      '<div class="col-md-8 col-lg-9">' +
      '<h1 class="detail-title">' + esc(d.title || '') + '</h1>' + date + chips + imdbBox + desc + dlPanel +
      '</div></div>' + related;
  }

  (function initServerFallback() {
    var host = $('#jsFallback');
    if (!host) return;

    var kind = host.dataset.kind || 'grid';
    var endpoint = host.dataset.endpoint || 'home';
    var params = {};
    try { params = JSON.parse(host.dataset.params || '{}'); } catch (e) { params = {}; }

    callApi(endpoint, params, 45000).then(function (data) {
      hideServerErrorUi();
      if (kind === 'detail') {
        document.title = (data.title || 'Movia') + ' — Movia';
        host.innerHTML = detailHtml(data);
      } else {
        renderFallbackGrid(host, data, endpoint, params);
      }
      host.classList.add('fb-done');
    }).catch(function (err) {
      var msg = err && err.message ? err.message : 'Could not load content.';
      if (err && err.detail) msg += ' — ' + err.detail;
      host.innerHTML =
        '<div class="alert alert-danger glass-alert d-flex align-items-center justify-content-between flex-wrap gap-2" role="alert">' +
        '<span><i class="bi bi-exclamation-triangle me-2"></i>' + esc(msg) + '</span>' +
        '<button type="button" class="btn btn-sm btn-outline-light" data-fb-retry>Retry</button></div>';
      var retry = host.querySelector('[data-fb-retry]');
      if (retry) retry.addEventListener('click', function () { location.reload(); });
    });
  })();

})();
