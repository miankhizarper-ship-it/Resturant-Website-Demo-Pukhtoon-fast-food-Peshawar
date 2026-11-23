<?php
/**
 * Movia — About page.
 */
require_once __DIR__ . '/includes/functions.php';

$pageTitle = 'About';
$activeNav = '';
require __DIR__ . '/includes/header.php';
?>

<section class="container section-pad">
  <div class="section-head">
    <h1 class="h3"><i class="bi bi-person-lines-fill text-accent me-2"></i>About Movia</h1>
  </div>

  <div class="glass p-4 p-md-5 legal-body">
    <p class="mb-4">Movia is a fast, clean browsing gateway for movies and web series — built to help you
      find a title and reach its download page in seconds, without ads, clutter, or slowdowns.</p>

    <h2>What Movia does</h2>
    <p>Movia indexes <strong>publicly available listing pages</strong> — genres, languages, years, qualities
      and sizes — and presents them as a fast, searchable grid. When you open a title, the detail page shows
      the available qualities, file sizes and release info we could read from the source page.</p>
    <ul>
      <li><strong>Search</strong> — instant suggestions as you type, powered by a single lightweight endpoint.</li>
      <li><strong>Explore</strong> — browse by genre, language, release year and file size with collapsible filters.</li>
      <li><strong>Detail pages</strong> — episode and batch links that take you straight to the source
        (&ldquo;get link&rdquo;) page, where you pick the episode or server yourself.</li>
      <li><strong>Every quality</strong> — 360p through 4K, dual audio and HDRips where the source offers them.</li>
    </ul>

    <h2>What Movia is not</h2>
    <p>Movia does <strong>not host, store, upload or stream any media files</strong>. Every download link on
      this site points to a third-party source page operated by someone else. Movia never scrapes, generates
      or hides the final link — you are always sent to the source to choose it yourself.</p>

    <h2>How it stays fast</h2>
    <p>Pages are plain PHP with no framework and responses are cached for a few minutes on the server.
      The site uses vanilla JavaScript (no jQuery) and third-party advertising scripts. The result is designed
      to stay usable on slow connections and older phones.</p>

    <h2>Open to feedback</h2>
    <p>Broken link, wrong info, or a feature you want? Check the
      <a href="privacy.php">Privacy Policy</a> and <a href="terms.php">Terms of Use</a>, and reach out through
      the contact options listed there.</p>

    <p class="legal-updated mb-0">Last updated: November 2026</p>
  </div>
</section>

<?php require __DIR__ . '/includes/footer.php'; ?>
