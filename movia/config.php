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

// Extra filter groups for the collapsible panel on explore.php.
define('EXPLORE_FILTERS', [
    'Genre' => [
        ['Action', '/movies-by-genre/action/'],
        ['Adventure', '/movies-by-genre/adventure/'],
        ['Comedy', '/movies-by-genre/comedy/'],
        ['Crime', '/movies-by-genre/crime/'],
        ['Drama', '/movies-by-genre/drama/'],
        ['Family', '/movies-by-genre/family/'],
        ['Fantasy', '/movies-by-genre/fantasy/'],
        ['History', '/movies-by-genre/history/'],
        ['Horror', '/movies-by-genre/horror/'],
        ['Mystery', '/movies-by-genre/mystery/'],
        ['Romance', '/movies-by-genre/romance/'],
        ['Sci-Fi', '/movies-by-genre/sci-fi/'],
        ['Thriller', '/movies-by-genre/thriller/'],
        ['War', '/movies-by-genre/war/'],
        ['Documentary', '/movies-by-genre/documentary/'],
        ['Biography', '/movies-by-genre/biography/'],
        ['Sports', '/movies-by-genre/sports/'],
        ['Animation', '/movies-by-genre/animated/'],
    ],
    'Language' => [
        ['Korean', '/language/korean/'],
        ['Japanese', '/language/japanese/'],
        ['Chinese', '/language/chinese/'],
        ['Spanish', '/language/spanish/'],
        ['French', '/language/french/'],
        ['German', '/language/german/'],
        ['Russian', '/language/russian/'],
        ['Italian', '/language/italian/'],
        ['Turkish', '/language/turkish/'],
        ['Arabic', '/language/arabian/'],
        ['Thai', '/language/thai/'],
        ['Portuguese', '/language/portuguese/'],
    ],
    'Year' => [
        ['2026', '/year/2026/'],
        ['2025', '/year/2025/'],
        ['2024', '/year/2024/'],
        ['2023', '/year/2023/'],
        ['2022', '/year/2022/'],
        ['2021', '/year/2021/'],
        ['2020', '/year/2020/'],
        ['2019', '/year/2019/'],
        ['2018', '/year/2018/'],
        ['2017', '/year/2017/'],
        ['2016', '/year/2016/'],
        ['2015', '/year/2015/'],
        ['2010–2015', '/year/2010-2015/'],
        ['2005–2010', '/year/2005-2010/'],
        ['2000–2005', '/year/2000-2005/'],
        ['1990–2000', '/year/1990-2000/'],
    ],
    'Size' => [
        ['≤ 300 MB', '/size/300mb/'],
        ['≤ 500 MB', '/size/500mb/'],
        ['≤ 700 MB', '/size/700mb/'],
        ['≤ 1 GB', '/size/1gb/'],
    ],
]);
