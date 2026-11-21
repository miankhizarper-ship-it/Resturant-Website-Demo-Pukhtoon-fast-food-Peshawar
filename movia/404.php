<?php
http_response_code(404);
$pageTitle = 'Page not found';
$activeNav = '';
require __DIR__ . '/includes/header.php';
?>
<section class="container section-pad">
  <div class="empty-state glass">
    <i class="bi bi-geo-alt"></i>
    <h1 class="h3 mb-2">404 — Page not found</h1>
    <p>The page you are looking for does not exist or has moved.</p>
    <div class="d-flex gap-2 justify-content-center">
      <a class="btn btn-accent" href="index.php"><i class="bi bi-house-door me-1"></i>Home</a>
      <a class="btn btn-outline-light" href="search.php"><i class="bi bi-search me-1"></i>Search</a>
    </div>
  </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
