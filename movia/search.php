<?php
/**
 * Movia — Search results.
 */
require_once __DIR__ . '/includes/functions.php';

$q = isset($_GET['q']) ? trim((string)$_GET['q']) : '';
$page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;

$data = null;
$error = null;
$items = [];
$pagination = [];

if ($q === '') {
    $error = null; // show the search box hero instead
} else {
    $data = api_get('search', ['q' => $q, 'page' => $page]);
    if (api_error($data)) {
        $error = api_error_message($data);
    } else {
        $items = isset($data['items']) && is_array($data['items']) ? $data['items'] : [];
        $pagination = isset($data['pagination']) ? $data['pagination'] : [];
    }
}

$pageTitle = $q !== '' ? 'Search: ' . $q : 'Search';
$activeNav = 'search';
require __DIR__ . '/includes/header.php';
?>

<section class="container section-pad">
  <div class="search-hero glass">
    <h1 class="display-6 fw-bold mb-3"><i class="bi bi-search text-accent me-2"></i>Search Movia</h1>
    <form action="search.php" method="get" class="row g-2 justify-content-center" role="search">
      <div class="col-sm-8 col-md-6">
        <input class="form-control form-control-lg" type="search" name="q" required
               placeholder="Try “one”, “hindi 720p”, “season 1”…"
               value="<?= e($q) ?>" autofocus aria-label="Search query">
      </div>
      <div class="col-sm-4 col-md-2 d-grid">
        <button class="btn btn-accent btn-lg" type="submit">Search</button>
      </div>
    </form>
    <div class="search-hints mt-3">
      <span class="text-muted small me-2">Popular:</span>
      <?php foreach (['one', 'hindi', 'hollywood', '720p', 'season 1'] as $hint): ?>
        <a class="badge-hint" href="search.php?q=<?= urlencode($hint) ?>"><?= e($hint) ?></a>
      <?php endforeach; ?>
    </div>
  </div>

  <?php if ($q === ''): ?>
    <div class="empty-state glass mt-4">
      <i class="bi bi-binoculars"></i>
      <p>Type a movie or series name above to begin.</p>
    </div>
  <?php elseif ($error): ?>
    <div class="alert alert-danger glass-alert mt-4 d-flex align-items-center justify-content-between flex-wrap gap-2" role="alert">
      <span><i class="bi bi-exclamation-triangle me-2"></i><?= e($error) ?></span>
      <a class="btn btn-sm btn-outline-light" href="search.php?q=<?= urlencode($q) ?>">Retry</a>
    </div>
  <?php else: ?>
    <div class="section-head mt-4">
      <h2>Results for “<?= e($q) ?>” <span class="text-muted fs-6">(page <?= $page ?>)</span></h2>
    </div>

    <?php if (!$items): ?>
      <div class="empty-state glass">
        <i class="bi bi-emoji-frown"></i>
        <p>No results found for “<?= e($q) ?>”. Check spelling or add the year.</p>
        <a class="btn btn-outline-light btn-sm" href="index.php">Back to home</a>
      </div>
    <?php else: ?>
      <div id="gridSearch" data-endpoint="search" data-q="<?= e($q) ?>" data-page="<?= $page ?>">
        <?= render_grid($items) ?>
      </div>
      <div class="mt-4">
        <?php render_pagination($pagination, ['q' => $q, 'page' => $page]); ?>
      </div>
    <?php endif; ?>
  <?php endif; ?>
</section>

<?php require __DIR__ . '/includes/footer.php'; ?>
