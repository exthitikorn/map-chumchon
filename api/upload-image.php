<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    echo json_encode(['error' => 'Method not allowed.']);
    exit;
}

if (!isset($_FILES['image']) || !is_array($_FILES['image'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No image uploaded.']);
    exit;
}

$file = $_FILES['image'];
if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'Image upload failed.']);
    exit;
}

$maxSize = 5 * 1024 * 1024;
if (($file['size'] ?? 0) > $maxSize) {
    http_response_code(400);
    echo json_encode(['error' => 'Image must be 5 MB or smaller.']);
    exit;
}

$finfo = finfo_open(FILEINFO_MIME_TYPE);
if ($finfo === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Unable to inspect uploaded file.']);
    exit;
}

$mime = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

$allowed = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
    'image/gif' => 'gif',
];

if (!is_string($mime) || !isset($allowed[$mime])) {
    http_response_code(400);
    echo json_encode(['error' => 'Only JPG, PNG, WebP, and GIF images are allowed.']);
    exit;
}

$imagesDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'images';
if (!is_dir($imagesDir) && !mkdir($imagesDir, 0755, true) && !is_dir($imagesDir)) {
    http_response_code(500);
    echo json_encode(['error' => 'Images directory not found.']);
    exit;
}

$pinId = isset($_POST['pinId']) ? preg_replace('/[^a-zA-Z0-9_-]/', '', (string) $_POST['pinId']) : '';
$prefix = $pinId !== '' ? $pinId : 'pin';
$filename = $prefix . '-' . time() . '.' . $allowed[$mime];
$destination = $imagesDir . DIRECTORY_SEPARATOR . $filename;

if (!move_uploaded_file($file['tmp_name'], $destination)) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save image.']);
    exit;
}

echo json_encode([
    'path' => 'images/' . $filename,
], JSON_UNESCAPED_UNICODE);
