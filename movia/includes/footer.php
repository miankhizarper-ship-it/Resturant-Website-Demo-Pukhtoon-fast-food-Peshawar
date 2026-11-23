</main>

<footer class="movia-footer mt-5">
  <div class="container">
    <div class="row g-4 align-items-start">
      <div class="col-md-4">
        <a class="navbar-brand footer-brand" href="index.php">
          <span class="brand-mark"><?= movia_logo_svg('ft') ?></span>
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
          <li><a href="about.php">About</a></li>
          <li><a href="privacy.php">Privacy Policy</a></li>
          <li><a href="terms.php">Terms of Use</a></li>
        </ul>
      </div>
      <div class="col-md-4">
        <h6 class="footer-head">Disclaimer</h6>
        <p class="footer-tag">This site only indexes publicly available pages. No files are hosted here. All downloads link to third-party sources.</p>
      </div>
    </div>
    <div class="footer-bottom">
      <span>&copy; <?= date('Y') ?> <?= e(SITE_NAME) ?></span>
      <span class="footer-legal">
        <a href="about.php">About</a> ·
        <a href="privacy.php">Privacy</a> ·
        <a href="terms.php">Terms</a>
      </span>
      <a href="#topNav" class="to-top" aria-label="Back to top"><i class="bi bi-arrow-up-circle"></i></a>
    </div>
  </div>
</footer>

<div class="native-ad-wrap container" aria-label="Advertisement">
  <iframe class="ref-banner ref-banner-wide" scrolling="no" frameborder="0"
          style="padding:0;margin:0;border:0;border-style:none"
          width="475" height="75"
          src="https://refbanners.com/I?tag=d_6396842m_3847c_&amp;site=6396842&amp;ad=3847"
          title="Advertisement" loading="lazy"></iframe>
  <iframe class="ref-banner" scrolling="no" frameborder="0"
          style="padding:0;margin:0;border:0;border-style:none"
          width="300" height="250"
          src="https://refbanners.com/I?tag=d_6396842m_3845c_&amp;site=6396842&amp;ad=3845"
          title="Advertisement" loading="lazy"></iframe>
</div>
<div class="toast-container position-fixed bottom-0 end-0 p-3" id="toastHost" aria-live="polite"></div>

<script>
(function () {
  var socialUrl = 'https://bancadeltempoidea.org/14/4afea7a863bafc1e8c17d80ef945b3eb';
  var nativeUrl = 'https://bancadeltempoidea.org/21/304b4a1c892cabd6be0fa50bc5c2007d';
  var nativeId = 'container-304b4a1c892cabd6be0fa50bc5c2007d';
  function loadAd(url, id, attrs) {
    var old = document.getElementById(id);
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var script = document.createElement('script');
    script.id = id;
    script.src = url + (url.indexOf('?') < 0 ? '?' : '&') + '_refresh=' + Date.now();
    Object.keys(attrs).forEach(function (key) { script.setAttribute(key, attrs[key]); });
    document.body.appendChild(script);
  }
  function refreshAds() {
    var slot = document.getElementById(nativeId);
    loadAd(socialUrl, 'movia-socialbar-ad', { 'data-cfasync': 'false' });
    if (slot) {
      slot.innerHTML = '';
      loadAd(nativeUrl, 'movia-native-ad', { async: 'async', 'data-cfasync': 'false' });
    }
  }
  refreshAds();
  window.setInterval(refreshAds, 30000);
})();
</script>
<script src="assets/js/bootstrap.bundle.min.js"></script>
<script src="assets/js/app.js"></script>
</body>
</html>
