</main>

<footer class="movia-footer mt-5">
  <div class="container">
    <div class="row g-4 align-items-start">
      <div class="col-md-4">
        <a class="navbar-brand footer-brand" href="index.php">
          <span class="brand-mark"><i class="bi bi-play-fill"></i></span>
          <span class="brand-name">Mo<span>v</span>ia</span>
        </a>
        <p class="footer-tag"><?= e(SITE_TAGLINE) ?></p>
      </div>
      <div class="col-md-4">
        <h6 class="footer-head">Quick links</h6>
        <ul class="footer-links">
          <li><a href="index.php">Home</a></li>
          <li><a href="explore.php?path=<?= urlencode('/movies/hollywood/') ?>">Hollywood</a></li>
          <li><a href="explore.php?path=<?= urlencode('/movies/latest-released/') ?>">Latest Released</a></li>
          <li><a href="search.php?q=hindi">Search</a></li>
        </ul>
      </div>
      <div class="col-md-4">
        <h6 class="footer-head">Disclaimer</h6>
        <p class="footer-tag">This site only indexes publicly available pages. No files are hosted here. All downloads link to third-party sources.</p>
      </div>
    </div>
    <div class="footer-bottom">
      <span>&copy; <?= date('Y') ?> <?= e(SITE_NAME) ?></span>
      <a href="#topNav" class="to-top" aria-label="Back to top"><i class="bi bi-arrow-up-circle"></i></a>
    </div>
  </div>
</footer>

<div class="toast-container position-fixed bottom-0 end-0 p-3" id="toastHost" aria-live="polite"></div>

<script src="assets/js/bootstrap.bundle.min.js"></script>
<script src="assets/js/app.js"></script>
</body>
</html>
