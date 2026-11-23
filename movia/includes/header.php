<?php
/**
 * Movia — shared <head> + navbar.
 * Expects: $pageTitle (string), optional $activeNav (home|search|explore|detail)
 */
require_once __DIR__ . '/functions.php';

$pageTitle = isset($pageTitle) ? $pageTitle : SITE_NAME;
$activeNav = isset($activeNav) ? $activeNav : '';
$siteName = SITE_NAME;
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#0b0f1a">
<title><?= e($pageTitle) ?><?= $pageTitle !== $siteName ? ' — ' . e($siteName) : '' ?></title>
<meta name="description" content="<?= e(SITE_TAGLINE) ?>">
<link rel="icon" href="data:image/svg+xml,<?= rawurlencode(movia_logo_svg('fav')) ?>">
<link rel="stylesheet" href="assets/css/bootstrap.min.css">
<link rel="stylesheet" href="assets/css/bootstrap-icons.min.css">
<link rel="stylesheet" href="assets/css/style.css">
<noscript><style>#pageSkeleton{display:none!important}</style></noscript>
<script>window.MOVIA_API = <?= json_encode(rtrim(API_BASE, '/')) ?>;</script>
</head>
<body>

<div class="page-skeleton" id="pageSkeleton" aria-hidden="true">
  <div class="skeleton-nav"><span class="sk-block sk-brand"></span><span class="sk-block sk-navitem"></span><span class="sk-block sk-navitem"></span><span class="sk-block sk-search"></span></div>
  <div class="skeleton-content">
    <span class="sk-block sk-title"></span>
    <div class="skeleton-chips"><i></i><i></i><i></i><i></i></div>
    <div class="skeleton-grid">
      <?php for ($sk = 0; $sk < 8; $sk++): ?><div class="skeleton-card"><span class="sk-block sk-poster"></span><span class="sk-block sk-line"></span><span class="sk-block sk-line short"></span></div><?php endfor; ?>
    </div>
  </div>
</div>
<script>
(function () {
  var s = document.getElementById('pageSkeleton');
  if (!s) return;
  var hide = function () {
    if (!s || s.classList.contains('skeleton-done')) return;
    s.classList.add('skeleton-done');
    setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 250);
  };
  if (document.readyState !== 'loading') hide();
  else document.addEventListener('DOMContentLoaded', hide, { once: true });
  window.addEventListener('pageshow', function (e) { if (e.persisted) hide(); });
  setTimeout(hide, 3500);
})();
</script>

<a class="skip-link" href="#main">Skip to content</a>

<nav class="navbar navbar-expand-lg sticky-top movia-nav" id="topNav">
  <div class="container">
    <a class="navbar-brand" href="index.php">
      <span class="brand-mark"><?= movia_logo_svg('nav') ?></span>
      <span class="brand-name">Mo<span>v</span>ia</span>
    </a>
    <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu"
            aria-controls="navMenu" aria-expanded="false" aria-label="Toggle navigation">
      <span class="navbar-toggler-icon"></span>
    </button>
    <div class="collapse navbar-collapse" id="navMenu">
      <ul class="navbar-nav me-auto mb-2 mb-lg-0">
        <li class="nav-item"><a class="nav-link<?= $activeNav === 'home' ? ' active' : '' ?>" href="index.php"><i class="bi bi-house-door me-1"></i>Home</a></li>
        <li class="nav-item dropdown">
          <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
            <i class="bi bi-grid me-1"></i>Explore
          </a>
          <ul class="dropdown-menu dropdown-menu-dark">
            <?php foreach (NAV_CATEGORIES as [$label, $navPath]): ?>
            <li><a class="dropdown-item" href="explore.php?path=<?= urlencode($navPath) ?>"><?= e($label) ?></a></li>
            <?php endforeach; ?>
          </ul>
        </li>
      </ul>
      <form class="d-flex nav-search" role="search" action="search.php" method="get" autocomplete="off">
        <div class="input-group">
          <input class="form-control" type="search" name="q" id="navSearchInput"
                 placeholder="Search movies, series…" aria-label="Search" required
                 value="<?= e(isset($_GET['q']) ? (string)$_GET['q'] : '') ?>">
          <button class="btn btn-accent" type="submit" aria-label="Search"><i class="bi bi-search"></i></button>
        </div>
        <div class="search-suggest dropdown-menu dropdown-menu-dark w-100" id="searchSuggest" aria-label="Suggestions"></div>
      </form>
    </div>
  </div>
</nav>

<main id="main">
