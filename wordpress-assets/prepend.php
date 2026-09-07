<?php
// Package-owned bootstrap, executed from the read-only bundle on every request.
declare(strict_types=1);
if (getenv('SERVERLESSWP_STREAM_PROVIDER')) {
    require_once __DIR__ . '/serverlesswp-stream-wrapper/bootstrap/prepend.php';
}
