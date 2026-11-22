<?php
/**
 * Movia — shared helpers (PHP 7.4+ / 8.x compatible, no extensions required
 * beyond optional cURL). Works on InfinityFree shared hosting.
 */

require_once __DIR__ . '/../config.php';

/** HTML-escape helper. */
function e($s): string
{
    return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/** Last transport-level error (for debug page & error details). */
function api_last_error(): string
{
    return isset($GLOBALS['mv_last_error']) ? (string)$GLOBALS['mv_last_error'] : '';
}

/**
 * Raw HTTP GET: cURL first (with a no-follow retry for open_basedir hosts),
 * then file_get_contents. Returns body or null; records the cause in
 * api_last_error() so debug.php / the UI can show exactly what failed.
 */
function http_get(string $url, int $timeout = 20): ?string
{
    $GLOBALS['mv_last_error'] = '';
    $errors = [];
    $headers = "Accept: application/json\r\nUser-Agent: Movia/1.0\r\n";
    $verify = defined('API_SSL_VERIFY') ? API_SSL_VERIFY : true;

    if (function_exists('curl_init')) {
        // Pass 1: follow redirects. Pass 2: no follow — some shared hosts
        // (open_basedir) reject CURLOPT_FOLLOWLOCATION and abort the request.
        foreach ([true, false] as $follow) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER   => true,
                CURLOPT_TIMEOUT          => $timeout,
                CURLOPT_CONNECTTIMEOUT    => 8,
                CURLOPT_FOLLOWLOCATION   => $follow,
                CURLOPT_MAXREDIRS        => 3,
                CURLOPT_USERAGENT        => 'Movia/1.0',
                CURLOPT_HTTPHEADER       => ['Accept: application/json'],
                CURLOPT_SSL_VERIFYPEER   => $verify,
                CURLOPT_SSL_VERIFYHOST   => $verify ? 2 : 0,
            ]);
            $body = curl_exec($ch);
            $errno = curl_errno($ch);
            $cerr = curl_error($ch);
            $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            // curl_close() is a no-op (and deprecated) on PHP >= 8.0.
            if (PHP_VERSION_ID < 80000) {
                curl_close($ch);
            }
            if ($body !== false) {
                $GLOBALS['mv_last_http_code'] = $code;
                if ($code >= 400 && $body === '') {
                    $errors[] = "HTTP $code (empty body)";
                    continue;
                }
                return $body;
            }
            $errors[] = 'curl' . ($follow ? '[follow]' : '[nofollow]') . " [$errno] $cerr";
        }
    } else {
        $errors[] = 'curl extension not available';
    }

    if (ini_get('allow_url_fopen')) {
        $ctx = stream_context_create([
            'http' => [
                'timeout'      => $timeout,
                'header'       => $headers,
                'ignore_errors' => true,
            ],
            'ssl' => [
                'verify_peer'      => $verify,
                'verify_peer_name' => $verify,
            ],
        ]);
        $body = @file_get_contents($url, false, $ctx);
        if ($body !== false) {
            $code = 0;
            $rh = $http_response_header ?? [];
            if ($rh && preg_match('#HTTP/\S+\s+(\d{3})#', $rh[0], $m)) {
                $code = (int)$m[1];
            }
            $GLOBALS['mv_last_http_code'] = $code;
            return $body;
        }
        $le = error_get_last();
        $errors[] = 'file_get_contents: ' . ($le['message'] ?? 'unknown error');
    } else {
        $errors[] = 'allow_url_fopen disabled';
    }

    $GLOBALS['mv_last_error'] = implode(' | ', array_unique($errors));
    return null;
}

/**
 * Call the Movia scraper API.
 *
 * @param string $endpoint home|search|explore|detail|source|generate
 * @param array  $params   query params
 * @return array|null decoded JSON or null on failure
 */
function api_get(string $endpoint, array $params = [], int $timeout = 20): ?array
{
    $url = rtrim(API_BASE, '/') . '/api/' . $endpoint;
    if ($params) {
        $url .= '?' . http_build_query($params);
    }

    // ---- optional static file cache ----
    $cacheFile = null;
    if (CACHE_TTL > 0 && @is_dir(CACHE_DIR)) {
        $cacheFile = CACHE_DIR . '/' . md5($url) . '.json';
        if (@is_file($cacheFile) && (time() - @filemtime($cacheFile)) < CACHE_TTL) {
            $cached = @file_get_contents($cacheFile);
            $decoded = $cached !== false ? json_decode($cached, true) : null;
            if (is_array($decoded)) {
                return $decoded;
            }
        }
    }

    $body = http_get($url, $timeout);
    if ($body === null) {
        $GLOBALS['mv_last_error'] = trim('API fetch failed (' . $endpoint . '): ' . api_last_error());
        return null;
    }
    $data = json_decode($body, true);
    if (!is_array($data)) {
        $snippet = trim(preg_replace('/\s+/', ' ', substr($body, 0, 160)));
        $httpCode = isset($GLOBALS['mv_last_http_code']) ? (int)$GLOBALS['mv_last_http_code'] : 0;
        $GLOBALS['mv_last_error'] = sprintf(
            'API returned non-JSON (HTTP %d): %s',
            $httpCode,
            $snippet !== '' ? $snippet : '(empty body)'
        );
        return null;
    }
    if ($cacheFile !== null) {
        @file_put_contents($cacheFile, $body);
    }
    $GLOBALS['mv_last_error'] = '';
    return $data;
}

/** Is this an API error payload? */
function api_error(?array $data): bool
{
    return $data === null || isset($data['error']);
}

/** Friendly error message for the UI. */
function api_error_message(?array $data): string
{
    if ($data === null) {
        return 'Could not reach the server. Please try again in a moment.';
    }
    return isset($data['error']) ? (string)$data['error'] : 'Something went wrong.';
}

/** Short technical cause shown collapsed under error banners (debug aid). */
function api_error_details(?array $data): string
{
    if ($data === null) {
        $t = api_last_error();
        return $t !== '' ? $t : 'No detail captured (cURL missing and allow_url_fopen off?)';
    }
    return json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}

/** Convert an absolute moviesmod URL to an internal explore path. */
function internal_path(string $url): string
{
    $path = parse_url($url, PHP_URL_PATH);
    if (!$path) {
        return '/';
    }
    return $path;
}

/** Build a local page URL, e.g. page_url(['q'=>'one','page'=>2]). */
function page_url(array $params): string
{
    $script = basename($_SERVER['SCRIPT_NAME'] ?? 'index.php');
    $qs = http_build_query($params);
    return $script . ($qs !== '' ? '?' . $qs : '');
}

/**
 * Server-rendered pagination (numbered pages + prev/next).
 *
 * @param array $pagination from API: current, pages[], next
 * @param array $query      current query params (page will be overridden)
 */
function render_pagination(array $pagination, array $query): void
{
    $current = (int)($pagination['current'] ?? 1);
    $pages = isset($pagination['pages']) && is_array($pagination['pages'])
        ? $pagination['pages'] : [];
    if (count($pages) < 2 && empty($pagination['next'])) {
        return;
    }

    $item = function (int $n, string $label, bool $active = false, bool $disabled = false) use ($query): string {
        if ($disabled) {
            return '<li class="page-item disabled"><span class="page-link">' . e($label) . '</span></li>';
        }
        $q = $query;
        $q['page'] = $n;
        $cls = $active ? ' page-item active' : ' page-item';
        return '<li class="' . $cls . '"><a class="page-link" href="' . e(page_url($q)) . '">' . e($label) . '</a></li>';
    };

    $numbers = [];
    foreach ($pages as $p) {
        $n = is_array($p) ? (int)($p['page'] ?? 0) : (int)$p;
        if ($n > 0) {
            $numbers[$n] = $n;
        }
    }
    $numbers[$current] = $current;
    ksort($numbers);

    echo '<nav aria-label="Pagination"><ul class="pagination justify-content-center flex-wrap">';
    echo $item($current - 1, '«', false, $current <= 1);

    $prevShown = 0;
    foreach ($numbers as $n) {
        if ($n > 1 && $n < $current && $n > $prevShown + 1) {
            echo '<li class="page-item disabled"><span class="page-link">…</span></li>';
        }
        echo $item($n, (string)$n, $n === $current);
        $prevShown = $n;
    }
    if (!empty($pagination['next']) && (!isset($numbers[$current + 1]))) {
        echo '<li class="page-item disabled"><span class="page-link">…</span></li>';
        echo $item($current + 1, (string)($current + 1));
    }

    $hasNext = !empty($pagination['next']) || isset($numbers[$current + 1]);
    echo $item($current + 1, '»', false, !$hasNext);
    echo '</ul></nav>';
}

/** Movie card markup used by home / search / explore / related grids. */
function render_card(array $item): void
{
    $slug = $item['slug'] ?? '';
    $title = $item['title'] ?? '';
    $image = $item['image'] ?? '';
    $href = 'detail.php?id=' . urlencode($slug);

    echo '<div class="col">';
    echo '<a class="movie-card h-100" href="' . e($href) . '">';
    echo '<div class="poster">';
    if ($image) {
        echo '<img src="' . e($image) . '" alt="' . e($title) . '" loading="lazy" decoding="async">';
    } else {
        echo '<div class="poster-fallback"><i class="bi bi-film"></i></div>';
    }
    echo '<div class="poster-overlay"><span class="view-btn"><i class="bi bi-play-fill"></i> View</span></div>';
    echo '</div>';
    echo '<div class="card-body">';
    echo '<h3 class="card-title" title="' . e($title) . '">' . e($title) . '</h3>';
    if (!empty($item['date'])) {
        echo '<p class="card-meta"><i class="bi bi-calendar3"></i> ' . e($item['date']) . '</p>';
    }
    echo '</div>';
    echo '</a>';
    echo '</div>';
}

/** Grid of cards with responsive column counts. */
function render_grid(array $items, string $extraClass = ''): void
{
    echo '<div class="row row-cols-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-5 g-3 g-md-4 ' . e($extraClass) . '">';
    foreach ($items as $item) {
        if (is_array($item)) {
            render_card($item);
        }
    }
    echo '</div>';
}

/** Skeleton cards for JS-driven loading states. */
function render_skeleton(int $count = 10): void
{
    echo '<div class="row row-cols-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-5 g-3 g-md-4">';
    for ($i = 0; $i < $count; $i++) {
        echo '<div class="col"><div class="movie-card skeleton-card">'
            . '<div class="poster skeleton shimmer"></div>'
            . '<div class="card-body"><div class="skeleton shimmer sk-line w-75"></div>'
            . '<div class="skeleton shimmer sk-line w-50 mt-2"></div></div></div></div>';
    }
    echo '</div>';
}
