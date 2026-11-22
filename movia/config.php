<?php
/**
 * Movia — site configuration.
 * API base can be overridden with the MOVIA_API env var (used for local testing).
 */
define('SITE_NAME', 'Movia');
define('SITE_TAGLINE', 'Movies & Series — fast, clean, free');

define(
    'API_BASE',
    getenv('MOVIA_API') ?: 'https://moviesmod-scraper.mkode.workers.dev'
);

// Set to false ONLY if your host has a broken CA bundle and debug.php
// reports "SSL certificate problem" for the API fetch.
define('API_SSL_VERIFY', true);

// Static page cache (seconds). Set to 0 to disable.
define('CACHE_TTL', 300);
define('CACHE_DIR', __DIR__ . '/cache');

// Hosts allowed for /api/source and /api/generate (SSRF guard, mirrors the worker).
define('ALLOWED_SOURCE_HOSTS', [
    'episodes.modpro.blog',
    'links.modpro.blog',
    'en.thenaukriadda.in',
    'gdrivepro.xyz',
    'urlflix.xyz',
    'moviesmod.fi',
]);

// Navbar categories -> internal explore paths.
define('NAV_CATEGORIES', [
    ['Hollywood',    '/movies/hollywood/'],
    ['Hindi',        '/language/hindi/'],
    ['Latest',       '/movies/latest-released/'],
    ['Web Series',   '/web-series/'],
    ['Dual Audio',   '/dual-audio/'],
    ['480p',         '/quality/480p/'],
    ['720p',         '/quality/720p/'],
    ['1080p',        '/quality/1080p/'],
]);
