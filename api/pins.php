<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$dataDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'data';
$pinsPath = $dataDir . DIRECTORY_SEPARATOR . 'community-pins.json';

if (!is_dir($dataDir)) {
    http_response_code(500);
    echo json_encode(['error' => 'Data directory not found.']);
    exit;
}

function loadPins(string $path): array
{
    if (!file_exists($path)) {
        return [];
    }

    $json = file_get_contents($path);
    if ($json === false || $json === '') {
        return [];
    }

    $data = json_decode($json, true);
    if (!is_array($data)) {
        return [];
    }

    return $data;
}

function savePins(string $path, array $pins): void
{
    $json = json_encode($pins, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    if ($json === false) {
        throw new RuntimeException('Failed to encode pins JSON.');
    }
    $json .= "\n";

    $tmpPath = $path . '.tmp';
    if (file_put_contents($tmpPath, $json, LOCK_EX) === false) {
        throw new RuntimeException('Failed to write temporary pins file.');
    }

    if (!rename($tmpPath, $path)) {
        throw new RuntimeException('Failed to move temporary pins file into place.');
    }
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$pins = loadPins($pinsPath);

try {
    if ($method === 'GET') {
        echo json_encode($pins, JSON_UNESCAPED_UNICODE);
        exit;
    }

    $raw = file_get_contents('php://input');
    $payload = $raw !== false && $raw !== '' ? json_decode($raw, true) : null;

    if ($payload === null && $raw !== '' && json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON payload.']);
        exit;
    }

    if ($method === 'POST') {
        if (!is_array($payload) || !isset($payload['pin']) || !is_array($payload['pin'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing pin data.']);
            exit;
        }

        $pin = $payload['pin'];
        if (!isset($pin['id']) || $pin['id'] === '') {
            http_response_code(400);
            echo json_encode(['error' => 'Pin id is required.']);
            exit;
        }

        $id = (string) $pin['id'];
        $found = false;
        foreach ($pins as $index => $existing) {
            if (isset($existing['id']) && (string) $existing['id'] === $id) {
                $pins[$index] = $pin;
                $found = true;
                break;
            }
        }
        if (!$found) {
            $pins[] = $pin;
        }

        savePins($pinsPath, $pins);
        echo json_encode($pins, JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($method === 'DELETE') {
        if (!is_array($payload) || !isset($payload['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing id for delete.']);
            exit;
        }

        $id = (string) $payload['id'];
        $pins = array_values(array_filter(
            $pins,
            static function ($pin) use ($id): bool {
                return !isset($pin['id']) || (string) $pin['id'] !== $id;
            }
        ));

        savePins($pinsPath, $pins);
        echo json_encode($pins, JSON_UNESCAPED_UNICODE);
        exit;
    }

    http_response_code(405);
    header('Allow: GET, POST, DELETE');
    echo json_encode(['error' => 'Method not allowed.']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error', 'detail' => $e->getMessage()]);
}

