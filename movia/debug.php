<?php
/**
 * Movia — connectivity diagnostics.
 * Open https://your-domain/debug.php when pages show "Could not reach the
 * server" to see exactly why PHP can't fetch the scraper API.
 *
 * This page only reads environment info and makes one test request to the
 * configured API — no secrets are printed. Delete it after debugging if
 * you like (it is also included in the zip for convenience).
 */
require_once __DIR__ . '/includes/functions.php';

$pageTitle = 'Debug — connectivity check';
$activeNav = '';
require __DIR__ . '/includes/header.php';

function status_icon(bool $ok): string
{
    return $ok
        ? '<span class="text-success"><i class="bi bi-check-circle-fill"></i> OK</span>'
        : '<span class="text-danger"><i class="bi bi-x-circle-fill"></i> FAIL</span>';
}

$host = parse_url(API_BASE, PHP_URL_HOST) ?: '';
$dnsOk = $host !== '' && gethostbyname($host) !== $host;
$dnsIp = $host !== '' ? gethostbyname($host) : '—';

$curlOk = function_exists('curl_init');
$fopenOk = (bool)ini_get('allow_url_fopen');
$sslVerify = defined('API_SSL_VERIFY') ? API_SSL_VERIFY : true;

// One real test fetch (15s cap so the page stays snappy).
$t0 = microtime(true);
$testBody = http_get(API_BASE . '/api/home?page=1', 15);
$elapsed = round((microtime(true) - $t0) * 1000);
$testError = api_last_error();
$testOk = $testBody !== null;
$jsonOk = false;
$jsonPreview = '';
if ($testOk) {
    $decoded = json_decode($testBody, true);
    $jsonOk = is_array($decoded);
    $jsonPreview = substr(preg_replace('/\s+/', ' ', $testBody), 0, 300);
}

// Does the cache dir work (InfinityFree needs it writable)?
$cacheWritable = is_dir(CACHE_DIR) && is_writable(CACHE_DIR);
$cacheFiles = is_dir(CACHE_DIR) ? count(glob(CACHE_DIR . '/*.json') ?: []) : 0;
?>

<section class="container section-pad">
  <div class="section-head">
    <h1 class="h3"><i class="bi bi-activity text-accent me-2"></i>Connectivity diagnostics</h1>
    <span class="text-muted small">last test: <?= $elapsed ?> ms</span>
  </div>

  <div class="glass p-3 p-md-4 mb-4">
    <h2 class="h5">Environment</h2>
    <table class="table table-dark table-striped align-middle mb-0">
      <tbody>
        <tr><td>PHP version</td><td><?= e(PHP_VERSION) ?> <?= status_icon(PHP_VERSION_ID >= 70400) ?></td></tr>
        <tr><td>cURL extension</td><td><?= status_icon($curlOk) ?> <?= $curlOk ? '(used first)' : '(will use file_get_contents)' ?></td></tr>
        <tr><td>allow_url_fopen</td><td><?= status_icon($fopenOk) ?> <?= $fopenOk ? 'On' : 'Off' ?></td></tr>
        <tr><td>open_basedir</td><td><?= e((string)ini_get('open_basedir')) ?: '<span class="text-muted">(none)</span>' ?></td></tr>
        <tr><td>SSL peer verify (API_SSL_VERIFY)</td><td><?= status_icon($sslVerify) ?> <?= $sslVerify ? 'On' : 'Off' ?></td></tr>
        <tr><td>API base</td><td><code><?= e(API_BASE) ?></code></td></tr>
        <tr><td>DNS for <?= e($host) ?></td><td><?= status_icon($dnsOk) ?> <code><?= e($dnsIp) ?></code></td></tr>
        <tr><td>Cache dir writable</td><td><?= status_icon($cacheWritable) ?> <?= $cacheFiles ?> cached JSON file(s)</td></tr>
        <tr><td>Remote address</td><td><code><?= e($_SERVER['REMOTE_ADDR'] ?? '—') ?></code></td></tr>
      </tbody>
    </table>
  </div>

  <div class="glass p-3 p-md-4 mb-4">
    <h2 class="h5">Live test: GET <code>/api/home?page=1</code></h2>
    <?php if ($testOk && $jsonOk): ?>
      <div class="alert alert-success mb-2"><i class="bi bi-check2-circle me-1"></i>
        PHP reached the worker and got valid JSON (<?= $elapsed ?> ms).</div>
    <?php elseif ($testOk && !$jsonOk): ?>
      <div class="alert alert-warning mb-2"><i class="bi bi-exclamation-triangle me-1"></i>
        Reached the worker but the response was not JSON — something (or someone) is intercepting the request.</div>
    <?php else: ?>
      <div class="alert alert-danger mb-2"><i class="bi bi-x-octagon me-1"></i>
        PHP could not fetch the API.</div>
    <?php endif; ?>

    <?php if ($testError): ?>
      <p class="small text-muted mb-1">Transport error:</p>
      <pre class="tech-details" style="display:block"><code><?= e($testError) ?></code></pre>
    <?php endif; ?>
    <?php if ($jsonPreview): ?>
      <p class="small text-muted mb-1">Response preview:</p>
      <pre class="tech-details" style="display:block"><code><?= e($jsonPreview) ?></code></pre>
    <?php endif; ?>
  </div>

  <div class="glass p-3 p-md-4">
    <h2 class="h5">What the results mean</h2>
    <ul class="small mb-2" style="line-height:1.9">
      <li><strong>DNS FAIL</strong> — the host can't resolve <code>workers.dev</code>. The browser fallback on the site will still work.</li>
      <li><strong>cURL FAIL + fopen Off</strong> — PHP has no way to make outbound requests. The browser fallback covers this too.</li>
      <li><strong>SSL certificate problem</strong> — set <code>define('API_SSL_VERIFY', false);</code> in <code>config.php</code>.</li>
      <li><strong>Timeout / connection refused</strong> — the host may block outbound traffic; the site's browser-direct fallback handles it.</li>
      <li><strong>Not JSON</strong> — a proxy/antivirus is rewriting responses; send this page's preview to your host.</li>
    </ul>
    <p class="small mb-0 text-muted">The site keeps working even when this test fails: pages fall back to calling the worker
      directly from the visitor's browser (the worker allows CORS).</p>
  </div>
</section>

<?php require __DIR__ . '/includes/footer.php'; ?>
