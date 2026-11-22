<?php
/**
 * Movia — Privacy policy page.
 */
require_once __DIR__ . '/includes/functions.php';

$pageTitle = 'Privacy Policy';
$activeNav = '';
require __DIR__ . '/includes/header.php';
?>

<section class="container section-pad">
  <div class="section-head">
    <h1 class="h3"><i class="bi bi-shield-lock text-accent me-2"></i>Privacy Policy</h1>
  </div>

  <div class="glass p-4 p-md-5 legal-body">
    <p class="legal-updated">Last updated: November 21, 2026</p>

    <p>Movia is built to be lightweight. In practice that means we collect as little as possible about you.
      This page explains exactly what happens when you use this site.</p>

    <h2>Information we collect</h2>
    <ul>
      <li><strong>No accounts.</strong> There is no sign-up, login or profile. We never ask for your name,
        email address or phone number.</li>
      <li><strong>No tracking cookies.</strong> Movia does not set advertising or analytics cookies, and does
        not use browser fingerprinting.</li>
      <li><strong>No personal storage.</strong> Movia does not use <code>localStorage</code>,
        <code>sessionStorage</code> or <code>document.cookie</code> in its JavaScript.</li>
      <li><strong>Standard server logs.</strong> Like almost any website, our host records basic request data
        (IP address, browser type, time of visit and the page requested) for security and abuse prevention.
        These logs are kept only as long as the host needs them for that purpose.</li>
    </ul>

    <h2>How we use data</h2>
    <p>Server log data is used only to keep the site running safely — detecting attacks, fixing errors and
      understanding aggregate traffic (for example, which pages are slow). We do not sell, rent or share it
      with advertisers.</p>

    <h2>Third-party links</h2>
    <p>Movia links out to third-party source and download pages. Those sites have their own privacy policies,
      and Movia has no control over what they collect. We recommend reviewing the policy of any site you
      visit from here.</p>

    <h2>Content from the source</h2>
    <p>Poster images and title details shown on Movia are read from publicly available source pages and are
      displayed here for identification and browsing convenience.</p>

    <h2>Children&rsquo;s privacy</h2>
    <p>Movia does not knowingly collect any information from children under 13. Since we collect no personal
      information at all, there is nothing of that kind to delete.</p>

    <h2>Changes to this policy</h2>
    <p>If Movia ever starts collecting something new, this page will be updated before that change takes
      effect. The &ldquo;Last updated&rdquo; date at the top will change whenever the policy is revised.</p>

    <h2>Contact</h2>
    <p>Questions about privacy? Reach out through the contact options listed on the
      <a href="about.php">About page</a> or through the site&rsquo;s official contact channel.</p>
  </div>
</section>

<?php require __DIR__ . '/includes/footer.php'; ?>
