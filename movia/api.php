<?php
/**
 * Movia — thin JSON proxy in front of the scraper worker.
 * Keeps the API URL out of the markup (optional) and adds short-lived caching.
 *
 *   api.php?endpoint=home&page=1
 *   api.php?endpoint=search&q=one
 *   api.php?endpoint=explore&path=/movies/hollywood/
 *   api.php?endpoint=detail&id=slug
 */
require_once __DIR__ . '/includes/functions.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: public, max-age=120');

$endpoint = isset($_GET['endpoint']) ? (string)$_GET['endpoint'] : '';
$allowed = ['home', 'search', 'explore', 'detail'];
if (!in_array($endpoint, $allowed, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Unknown endpoint']);
    exit;
}

$params = [];
$timeout = 20;

switch ($endpoint) {
    case 'home':
        $params['page'] = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        break;

    case 'search':
        $q = isset($_GET['q']) ? trim((string)$_GET['q']) : '';
        if ($q === '' || strlen($q) > 100) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing or invalid q']);
            exit;
        }
        $params['q'] = $q;
        $params['page'] = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        break;

    case 'explore':
        $path = isset($_GET['path']) ? trim((string)$_GET['path']) : '';
        if ($path === '' || $path[0] !== '/' || strpos($path, '..') !== false) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid path']);
            exit;
        }
        $params['path'] = $path;
        $params['page'] = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        break;

    case 'detail':
        $id = isset($_GET['id']) ? trim((string)$_GET['id']) : '';
        if ($id === '' || strlen($id) > 300) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing id']);
            exit;
        }
        $params['id'] = $id;
        break;

}

$data = api_get($endpoint, $params, $timeout);

if ($data === null) {
    http_response_code(502);
    echo json_encode([
        'error'  => 'Upstream API unreachable',
        'detail' => api_last_error(),
    ]);
    exit;
}

// Surface upstream errors with their status so the UI can react.
if (isset($data['error'])) {
    http_response_code(isset($data['status']) ? (int)$data['status'] : 502);
}

echo json_encode($data);
