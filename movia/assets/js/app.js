/* ==========================================================================
   Movia — front-end app
   - live search suggestions
   - detail download flow: /api/source  ->  /api/generate  ->  final link
   - load-more grid paging
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

  /**
   * Call the Movia proxy API (api.php) with graceful fallbacks.
   * Returns a parsed JSON object; throws Error on failure.
   */
  async function callApi(endpoint, params, timeoutMs) {
    params = params || {};
    params.endpoint = endpoint;
    var qs = new URLSearchParams(params).toString();
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, timeoutMs || 30000);
    try {
      var res = await fetch('api.php?' + qs, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
      var data = null;
      try { data = await res.json(); } catch (e) { data = null; }
      if (!res.ok || !data || data.error) {
        var msg = (data && data.error) ? data.error : ('Request failed (' + res.status + ')');
        var err = new Error(msg);
        err.status = res.status;
        throw err;
      }
      return data;
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('Request timed out. Please try again.');
      throw e;
    } finally {
      clearTimeout(timer);
    }
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
          var res = await fetch('api.php?' + new URLSearchParams({ endpoint: 'search', q: q, page: 1 }),
            { signal: abort.signal });
          var data = await res.json();
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

  /* ---------------- detail: download flow ---------------- */

  (function initDownload() {
    var panel = $('#downloadPanel');
    if (!panel) return;

    panel.addEventListener('click', async function (ev) {
      var btn = ev.target.closest('.btn-dl[data-source-url]');
      if (!btn) return;

      var group = btn.closest('.dl-group');
      var result = group ? group.querySelector('.dl-result') : null;
      if (!result) return;

      // Close other groups' results (accordion feel)
      $$('.dl-result', panel).forEach(function (r) {
        if (r !== result) { r.hidden = true; r.innerHTML = ''; }
      });

      // Toggle this group
      if (!result.hidden && result.dataset.url === btn.dataset.sourceUrl) {
        result.hidden = true;
        result.innerHTML = '';
        return;
      }

      var sourceUrl = btn.dataset.sourceUrl;
      result.dataset.url = sourceUrl;
      result.hidden = false;
      result.innerHTML =
        '<div class="dl-steps">' +
        '<div class="dl-step active" data-step="1"><span class="dot"></span> Fetching available links…</div>' +
        '<div class="dl-step" data-step="2"><span class="dot"></span> Waiting for you to pick a server / episode</div>' +
        '<div class="dl-step" data-step="3"><span class="dot"></span> Generating direct download link</div>' +
        '</div>';

      $$('.btn-dl', group).forEach(function (b) { b.classList.add('loading'); });

      try {
        var src = await callApi('source', { url: sourceUrl }, 35000);
        var links = Array.isArray(src.links) ? src.links : [];
        if (!links.length) throw new Error('No links found on this page.');

        var steps = $('.dl-steps', result);
        if (steps) {
          steps.querySelector('[data-step="1"]').classList.replace('active', 'done');
          steps.querySelector('[data-step="2"]').classList.add('active');
        }

        var list = document.createElement('div');
        list.className = 'source-list mt-2';
        list.innerHTML = links.map(function (l, i) {
          return '<button type="button" class="source-item" data-url="' + esc(l.url) + '" data-index="' + i + '">' +
            '<span class="si-label"><i class="bi ' + (kindIcon(l.kind, l.label)) + '"></i>' +
            '<span>' + esc(l.label || ('Link ' + (i + 1))) + '</span></span>' +
            '<span class="si-go">Get link</span></button>';
        }).join('');
        result.appendChild(list);

        list.addEventListener('click', function (e2) {
          var item = e2.target.closest('.source-item');
          if (!item || item.disabled) return;
          resolveSource(item, list, result, steps);
        });

      } catch (err) {
        result.innerHTML = '<p class="error-line"><i class="bi bi-x-circle"></i> ' + esc(err.message) +
          ' <button type="button" class="btn btn-outline-light btn-sm ms-2" data-retry>Retry</button></p>';
        $('[data-retry]', result).addEventListener('click', function () {
          result.hidden = true;
          btn.click();
        });
      } finally {
        $$('.btn-dl', group).forEach(function (b) { b.classList.remove('loading'); });
      }
    });

    function kindIcon(kind, label) {
      var s = (kind || '') + ' ' + (label || '');
      if (/batch|zip/i.test(s)) return 'bi-file-earmark-zip';
      if (/episode/i.test(s)) return 'bi-list-ol';
      if (/onedrive/i.test(s)) return 'bi-cloud';
      if (/g-?direct|gdrive|drive|server/i.test(s)) return 'bi-google';
      if (/other/i.test(s)) return 'bi-link-45deg';
      return 'bi-download';
    }

    /* Step 2+3: user picked an item -> generate the final link */
    async function resolveSource(item, list, result, steps) {
      var url = item.dataset.url;
      item.disabled = true;
      var go = item.querySelector('.si-go');
      if (go) go.innerHTML = '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span>';

      if (steps) {
        var s2 = steps.querySelector('[data-step="2"]');
        var s3 = steps.querySelector('[data-step="3"]');
        if (s2) s2.classList.replace('active', 'done');
        if (s3) s3.classList.add('active');
      }

      try {
        var gen = await callApi('generate', { url: url }, 60000);
        var finalUrl = gen && gen.downloadUrl;
        if (!finalUrl) throw new Error('Could not generate a download link.');

        if (steps) {
          var s3b = steps.querySelector('[data-step="3"]');
          if (s3b) s3b.classList.replace('active', 'done');
        }

        var label = item.querySelector('.si-label span');
        var row = document.createElement('div');
        row.className = 'final-link mt-2';
        row.innerHTML =
          '<div><div class="fl-title"><i class="bi bi-check-circle-fill me-1"></i>Ready: ' +
          esc(label ? label.textContent : 'Download') + '</div>' +
          '<small class="text-muted">' + esc(finalUrl.replace(/^https?:\/\//, '').slice(0, 70)) + '…</small></div>' +
          '<div class="fl-actions">' +
          '<a class="btn-success-grad" href="' + esc(finalUrl) + '" target="_blank" rel="noopener nofollow">' +
          '<i class="bi bi-download"></i> Download now</a>' +
          '<button type="button" class="btn btn-outline-light btn-sm" data-copy="' + esc(finalUrl) + '">' +
          '<i class="bi bi-clipboard"></i> Copy</button></div>';

        item.replaceWith(row);
        toast('Download link ready!', 'success');
      } catch (err) {
        item.disabled = false;
        if (go) go.textContent = 'Get link';
        toast(err.message, 'error');
        var errLine = document.createElement('p');
        errLine.className = 'error-line mt-2';
        errLine.innerHTML = '<i class="bi bi-x-circle"></i> ' + esc(err.message);
        result.appendChild(errLine);
        setTimeout(function () { errLine.remove(); }, 5000);
      }
    }
  })();

  /* ---------------- copy buttons (delegated) ---------------- */

  document.addEventListener('click', function (ev) {
    var btn = ev.target.closest('[data-copy]');
    if (!btn) return;
    var text = btn.getAttribute('data-copy');
    var done = function () { toast('Link copied to clipboard', 'success'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text, done); });
    } else {
      fallbackCopy(text, done);
    }
  });

  function fallbackCopy(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { toast('Copy failed', 'error'); }
    ta.remove();
  }

  /* ---------------- load more (home grid) ---------------- */

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
        frag.innerHTML = '<div class="row row-cols-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-5 g-3 g-md-4">' +
          items.map(cardHtml).join('') + '</div>';
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

})();
