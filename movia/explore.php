<?php
/**
 * Movia — Explore / category listing.
 * ?path=/movies/hollywood/  ?page=2
 */
require_once __DIR__ . '/includes/functions.php';

$path = isset($_GET['path']) ? trim((string)$_GET['path']) : '/movies/hollywood/';
// Only internal paths allowed.
if ($path === '' || $path[0] !== '/' || strpos($path, '..') !== false || preg_match('#^/https?://#', $path)) {
    $path = '/movies/hollywood/';
}
$page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;

$data = api_get('explore', ['path' => $path, 'page' => $page]);
$error = api_error($data) ? api_error_message($data) : null;
$items = (!$error && isset($data['items']) && is_array($data['items'])) ? $data['items'] : [];
$pagination = (!$error && isset($data['pagination'])) ? $data['pagination'] : [];

$heading = 'Explore';
if (!$error && isset($data['heading']['label']) && $data['heading']['label'] !== '') {
    $heading = $data['heading']['label'];
} elseif (substr($path, -1) === '/') {
    $seg = trim($path, '/');
    if ($seg !== '') {
        $heading = ucwords(str_replace(['-', '/'], ' ', basename($seg)));
    }
}

$pageTitle = $heading . ($page > 1 ? ' — Page ' . $page : '');
$activeNav = 'explore';
require __DIR__ . '/includes/header.php';
?>

<section class="container section-pad">
  <div class="section-head">
    <h1 class="h3"><i class="bi bi-grid-fill text-accent me-2"></i><?= e($heading) ?></h1>
    <span class="text-muted small">page <?= $page ?></span>
  </div>

  <div class="chip-row mb-4">
    <?php foreach (NAV_CATEGORIES as [$label, $p]): ?>
      <a class="chip<?= $p === $path ? ' chip-active' : '' ?>" href="explore.php?path=<?= urlencode($p) ?>"><?= e($label) ?></a>
    <?php endforeach; ?>
  </div>

  <?php if ($error): ?>
    <div class="alert alert-danger glass-alert js-fallback-hide d-flex align-items-center justify-content-between flex-wrap gap-2" role="alert">
      <span><i class="bi bi-exclamation-triangle me-2"></i><?= e($error) ?></span>
      <a class="btn btn-sm btn-outline-light" href="explore.php?path=<?= urlencode($path) ?>">Retry</a>
    </div>
    <details class="tech-details js-fallback-hide mb-3">
      <summary>Technical details</summary>
      <code><?= e(api_error_details($data)) ?></code>
    </details>
    <?php if ($data === null): ?>
      <!-- Server couldn't fetch the API: the browser will try the worker directly. -->
      <div id="jsFallback" data-kind="grid" data-endpoint="explore"
           data-params="<?= e(json_encode(['path' => $path, 'page' => $page])) ?>"></div>
    <?php endif; ?>
  <?php elseif (!$items): ?>
    <div class="empty-state glass">
      <i class="bi bi-inbox"></i>
      <p>Nothing here yet.</p>
      <a class="btn btn-outline-light btn-sm" href="index.php">Back to home</a>
    </div>
  <?php else: ?>
    <div id="gridExplore" data-endpoint="explore" data-path="<?= e($path) ?>" data-page="<?= $page ?>">
      <?= render_grid($items) ?>
    </div>
    <div class="mt-4">
      <?php render_pagination($pagination, ['path' => $path, 'page' => $page]); ?>
    </div>
  <?php endif; ?>
</section>

<?php require __DIR__ . '/includes/footer.php'; ?>
