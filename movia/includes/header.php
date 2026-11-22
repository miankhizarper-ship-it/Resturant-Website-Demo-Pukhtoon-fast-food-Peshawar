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
<link rel="icon" href="data:image/svg+xml,<?= rawurlencode('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#e50914"/><path d="M24 18v28l22-14z" fill="#fff"/></svg>') ?>">
<link rel="stylesheet" href="assets/css/bootstrap.min.css">
<link rel="stylesheet" href="assets/css/bootstrap-icons.min.css">
<link rel="stylesheet" href="assets/css/style.css">
<script>window.MOVIA_API = <?= json_encode(rtrim(API_BASE, '/')) ?>;</script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>

<nav class="navbar navbar-expand-lg sticky-top movia-nav" id="topNav">
  <div class="container">
    <a class="navbar-brand" href="index.php">
      <span class="brand-mark"><i class="bi bi-play-fill"></i></span>
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
            <?php foreach (NAV_CATEGORIES as [$label, $path]): ?>
            <li><a class="dropdown-item" href="explore.php?path=<?= urlencode($path) ?>"><?= e($label) ?></a></li>
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
