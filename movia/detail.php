<?php
/**
 * Movia — Detail page.
 * ?id=<slug>   (slug = path segment after moviesmod.fi/)
 *
 * Download buttons are plain links: clicking one redirects the visitor to
 * the source ("get link") page, where they pick the episode/server themselves.
 * Movia never scrapes or generates the final link.
 */
require_once __DIR__ . '/includes/functions.php';

$id = isset($_GET['id']) ? trim((string)$_GET['id']) : '';
// Accept a full URL too: strip domain, keep slug.
if (preg_match('#^https?://[^/]+/(.+?)/?$#', $id, $m)) {
    $id = trim($m[1], '/');
}
$id = trim($id, '/');

if ($id === '' || !preg_match('/^[a-z0-9\-_.]+$/i', $id)) {
    http_response_code(400);
    $pageTitle = 'Invalid link';
    $activeNav = '';
    require __DIR__ . '/includes/header.php';
    echo '<section class="container section-pad"><div class="empty-state glass"><i class="bi bi-exclamation-circle"></i>'
        . '<p>Invalid movie id.</p><a class="btn btn-outline-light btn-sm" href="index.php">Back to home</a></div></section>';
    require __DIR__ . '/includes/footer.php';
    exit;
}

$data = api_get('detail', ['id' => $id]);
$error = api_error($data) ? api_error_message($data) : null;

$pageTitle = $error ? 'Not found' : ($data['title'] ?? SITE_NAME);
$activeNav = 'detail';
require __DIR__ . '/includes/header.php';
?>

<section class="container section-pad">
  <?php if ($error): ?>
    <div class="empty-state glass js-fallback-hide">
      <i class="bi bi-exclamation-triangle"></i>
      <p>Server error. Please refresh and try again.</p>
      <div class="d-flex gap-2 justify-content-center">
        <a class="btn btn-outline-light btn-sm" href="index.php">Home</a>
        <button class="btn btn-accent btn-sm" type="button" onclick="window.location.reload()">Refresh</button>
      </div>
    </div>
    <?php if ($data === null): ?>
      <!-- Server couldn't fetch the API: the browser will try the worker directly. -->
      <div id="jsFallback" data-kind="detail" data-endpoint="detail"
           data-params="<?= e(json_encode(['id' => $id])) ?>"></div>
    <?php endif; ?>
  <?php else: ?>
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb glass-crumb">
        <li class="breadcrumb-item"><a href="index.php"><i class="bi bi-house-door me-1"></i>Home</a></li>
        <?php if (!empty($data['categories'][0])): ?>
          <li class="breadcrumb-item">
            <a href="explore.php?path=<?= urlencode(internal_path($data['categories'][0]['url'])) ?>">
              <?= e($data['categories'][0]['name']) ?>
            </a>
          </li>
        <?php endif; ?>
        <li class="breadcrumb-item active" aria-current="page">Details</li>
      </ol>
    </nav>

    <div class="row g-4 detail-top">
      <div class="col-md-4 col-lg-3">
        <div class="detail-poster glass">
          <?php if (!empty($data['imdb']['poster'])): ?>
            <img src="<?= e($data['imdb']['poster']) ?>" alt="<?= e($data['title']) ?>" class="img-fluid">
          <?php elseif (!empty($data['related'][0]['image'])): ?>
            <img src="<?= e($data['related'][0]['image']) ?>" alt="<?= e($data['title']) ?>" class="img-fluid">
          <?php else: ?>
            <div class="poster-fallback big"><i class="bi bi-film"></i></div>
          <?php endif; ?>
          <?php if (!empty($data['imdb']['rating'])): ?>
            <div class="rating-badge" title="IMDb rating">
              <i class="bi bi-star-fill"></i> <?= e($data['imdb']['rating']) ?>
            </div>
          <?php endif; ?>
        </div>
        <div class="detail-rail-ad" aria-label="Advertisement">
          <iframe class="ref-banner ref-banner-tall" scrolling="no" frameborder="0"
                  style="padding:0;margin:0;border:0;border-style:none"
                  width="160" height="600"
                  src="https://refbanners.com/I?tag=d_6396842m_3871c_&amp;site=6396842&amp;ad=3871"
                  title="Advertisement" loading="lazy"></iframe>
        </div>
      </div>

      <div class="col-md-8 col-lg-9">
        <h1 class="detail-title"><?= e($data['title'] ?? '') ?></h1>

        <?php if (!empty($data['date'])): ?>
          <p class="detail-meta"><i class="bi bi-calendar3 me-1"></i><?= e($data['date']) ?></p>
        <?php endif; ?>

        <?php if (!empty($data['categories'])): ?>
          <div class="chip-row mb-3">
            <?php foreach ($data['categories'] as $cat): ?>
              <a class="chip" href="explore.php?path=<?= urlencode(internal_path($cat['url'])) ?>"><?= e($cat['name']) ?></a>
            <?php endforeach; ?>
          </div>
        <?php endif; ?>

        <?php if (!empty($data['imdb'])): $imdb = $data['imdb']; ?>
        <div class="imdb-box glass mb-3">
          <div class="row g-3 align-items-center">
            <div class="col-auto">
              <?php if (!empty($imdb['poster'])): ?>
                <img src="<?= e($imdb['poster']) ?>" alt="" class="imdb-thumb rounded">
              <?php endif; ?>
            </div>
            <div class="col">
              <h5 class="mb-1">
                <?= e($imdb['title'] ?? '') ?>
                <?php if (!empty($imdb['year'])): ?><span class="text-muted">(<?= e($imdb['year']) ?>)</span><?php endif; ?>
                <?php if (!empty($imdb['imdbUrl'])): ?>
                  <a class="ms-2 small" href="<?= e($imdb['imdbUrl']) ?>" target="_blank" rel="noopener nofollow">
                    <i class="bi bi-box-arrow-up-right"></i> IMDb
                  </a>
                <?php endif; ?>
              </h5>
              <?php if (!empty($imdb['genres']) || !empty($imdb['released'])): ?>
                <p class="small text-muted mb-1">
                  <?= e($imdb['genres'] ?? '') ?><?= !empty($imdb['released']) ? ' &bull; ' . e($imdb['released']) : '' ?>
                </p>
              <?php endif; ?>
              <?php if (!empty($imdb['ratingText'])): ?>
                <p class="small mb-1"><i class="bi bi-star-fill text-warning me-1"></i><?= e($imdb['ratingText']) ?></p>
              <?php endif; ?>
              <?php if (!empty($imdb['teaser'])): ?>
                <p class="small mb-1"><?= e($imdb['teaser']) ?></p>
              <?php endif; ?>
              <?php if (!empty($imdb['director']) || !empty($imdb['actors'])): ?>
                <p class="small text-muted mb-0">
                  <?php if (!empty($imdb['director'])): ?><strong>Director:</strong> <?= e($imdb['director']) ?><br><?php endif; ?>
                  <?php if (!empty($imdb['actors'])): ?><strong>Cast:</strong> <?= e($imdb['actors']) ?><?php endif; ?>
                </p>
              <?php endif; ?>
            </div>
          </div>
        </div>
        <?php endif; ?>

        <?php if (!empty($data['description'])): ?>
          <div class="detail-desc glass p-3 mb-3">
            <p class="mb-0"><?= e($data['description']) ?></p>
          </div>
        <?php endif; ?>

        <!-- ============ DOWNLOAD SECTION ============ -->
        <div class="download-panel glass p-3 p-md-4" id="downloadPanel">
          <h2 class="h5 mb-1"><i class="bi bi-download text-accent me-1"></i>Download</h2>
          <p class="text-muted small mb-3">Choose a quality — you'll be redirected to the get-link page to pick your episode or server.</p>

          <?php if (empty($data['downloadGroups'])): ?>
            <div class="alert alert-warning mb-0"><i class="bi bi-exclamation-circle me-2"></i>No download buttons found on this page.</div>
          <?php else: ?>
            <?php foreach ($data['downloadGroups'] as $gi => $group): ?>
              <div class="dl-group mb-3" data-group="<?= $gi ?>">
                <?php if (!empty($group['quality'])): ?>
                  <div class="dl-quality"><i class="bi bi-hd-circle me-1"></i><?= e($group['quality']) ?></div>
                <?php endif; ?>
                <div class="dl-buttons">
                  <?php foreach ($group['buttons'] as $btn): ?>
                    <?php if (!empty($btn['disabled'])): ?>
                      <button class="btn btn-dl" disabled title="Currently unavailable">
                        <i class="bi bi-lock me-1"></i><?= e($btn['label'] ?? 'Link') ?>
                      </button>
                    <?php else: ?>
                      <a class="btn btn-dl" href="<?= e($btn['url']) ?>" target="_blank" rel="nofollow noopener noreferrer">
                        <i class="bi bi-download me-1"></i><?= e($btn['label'] ?? 'Link') ?>
                      </a>
                    <?php endif; ?>
                  <?php endforeach; ?>
                </div>
              </div>
            <?php endforeach; ?>
          <?php endif; ?>
        </div>
      </div>
    </div>

    <?php if (!empty($data['related'])): ?>
      <div class="section-head mt-5">
        <h2 class="h4"><i class="bi bi-collection-play text-accent me-2"></i>Related</h2>
      </div>
      <?= render_grid($data['related']) ?>
    <?php endif; ?>
  <?php endif; ?>
</section>

<?php require __DIR__ . '/includes/footer.php'; ?>
