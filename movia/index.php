<?php
/**
 * Movia — Home: latest movies from the scraper API.
 */
require_once __DIR__ . '/includes/functions.php';

$page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
$data = api_get('home', ['page' => $page]);
$error = api_error($data) ? api_error_message($data) : null;
$items = (!$error && isset($data['items']) && is_array($data['items'])) ? $data['items'] : [];
$pagination = (!$error && isset($data['pagination'])) ? $data['pagination'] : [];

// Hero = first item on page 1 (engaging above-the-fold).
$hero = ($page === 1 && $items) ? array_shift($items) : null;

$pageTitle = $page > 1 ? 'Home — Page ' . $page : SITE_NAME;
$activeNav = 'home';
require __DIR__ . '/includes/header.php';
?>

<?php if ($hero): ?>
<section class="hero-section">
  <div class="hero-backdrop" style="background-image:url('<?= e($hero['image'] ?? '') ?>')"></div>
  <div class="container hero-inner">
    <div class="hero-card glass">
      <div class="hero-poster">
        <?php if (!empty($hero['image'])): ?>
          <img src="<?= e($hero['image']) ?>" alt="<?= e($hero['title'] ?? '') ?>">
        <?php else: ?>
          <div class="poster-fallback"><i class="bi bi-film"></i></div>
        <?php endif; ?>
      </div>
      <div class="hero-info">
        <span class="badge-accent"><i class="bi bi-fire me-1"></i>Latest release</span>
        <h1><?= e($hero['title'] ?? '') ?></h1>
        <?php if (!empty($hero['date'])): ?>
          <p class="hero-meta"><i class="bi bi-calendar3 me-1"></i><?= e($hero['date']) ?></p>
        <?php endif; ?>
        <div class="hero-actions">
          <a class="btn btn-accent btn-lg" href="detail.php?id=<?= urlencode($hero['slug'] ?? '') ?>">
            <i class="bi bi-download me-1"></i> View &amp; Download
          </a>
        </div>
      </div>
    </div>
  </div>
</section>
<?php endif; ?>

<section class="container section-pad">
  <div class="section-head">
    <h2><i class="bi bi-lightning-charge-fill text-accent"></i> Latest Movies &amp; Series</h2>
    <a class="btn btn-outline-light btn-sm" href="explore.php?path=<?= urlencode('/movies/') ?>">
      Explore all <i class="bi bi-arrow-right ms-1"></i>
    </a>
  </div>

  <?php if ($error): ?>
    <div class="alert alert-danger glass-alert js-fallback-hide d-flex align-items-center justify-content-between flex-wrap gap-2" role="alert">
      <span><i class="bi bi-exclamation-triangle me-2"></i><?= e($error) ?></span>
      <a class="btn btn-sm btn-outline-light" href="index.php<?= $page > 1 ? '?page=' . $page : '' ?>">Retry</a>
    </div>
    <details class="tech-details js-fallback-hide mb-3">
      <summary>Technical details</summary>
      <code><?= e(api_error_details($data)) ?></code>
    </details>
    <?php if (isset($data['status']) && (int)$data['status'] === 429): ?>
      <p class="text-muted small">Rate limit hit — the free worker tier allows a limited number of requests. Try again shortly.</p>
    <?php endif; ?>
    <?php if ($data === null): ?>
      <!-- Server couldn't fetch the API: the browser will try the worker directly. -->
      <div id="jsFallback" data-kind="grid" data-endpoint="home"
           data-params="<?= e(json_encode(['page' => $page])) ?>"></div>
    <?php endif; ?>
  <?php elseif (!$items): ?>
    <div class="empty-state glass">
      <i class="bi bi-inbox"></i>
      <p>No results found.</p>
    </div>
  <?php else: ?>
    <div id="gridHome" data-endpoint="home" data-page="<?= $page ?>">
      <?= render_grid($items) ?>
    </div>
    <div class="text-center mt-4" id="pagerHome">
      <?php render_pagination($pagination, ['page' => $page]); ?>
    </div>
    <div class="text-center mt-4" id="loadMoreWrap" hidden>
      <button class="btn btn-accent btn-lg" id="loadMoreBtn" data-endpoint="home" data-next-page="<?= $page + 1 ?>">
        <i class="bi bi-plus-circle me-1"></i> Load more
      </button>
    </div>
  <?php endif; ?>
</section>

<?php require __DIR__ . '/includes/footer.php'; ?>
