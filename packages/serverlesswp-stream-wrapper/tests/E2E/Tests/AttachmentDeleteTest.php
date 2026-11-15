<?php

declare(strict_types=1);

namespace ServerlessWpStreamWrapper\Tests\E2E\Tests;

class AttachmentDeleteTest extends E2ETestCase
{
    public function testDeletingAnAttachmentDeletesItsRemoteFiles(): void
    {
        $name       = 'e2e-delete-' . getmypid();
        $attachment = $this->uploadMedia($this->fixturesDir() . '/test-image.jpg', $name . '.jpg');
        $this->assertArrayHasKey('id', $attachment);

        $stored = $this->keysFor($name);
        $this->assertGreaterThanOrEqual(
            2,
            count($stored),
            'Expected the original and at least one image size in storage. Found: ' . implode(', ', $stored),
        );

        [$status, $body] = $this->deleteMedia((int) $attachment['id']);
        $this->assertSame(200, $status, "Media delete failed: {$body}");

        $this->assertSame(
            [],
            $this->keysFor($name),
            'Deleting the attachment left its files in storage.',
        );
    }

    /** @return string[] */
    private function keysFor(string $name): array
    {
        return array_values(array_filter(
            $this->listStorageKeys('uploads'),
            fn(string $k) => str_contains($k, $name),
        ));
    }

    private function deleteMedia(int $id): array
    {
        $token = base64_encode($this->wpUser . ':' . $this->wpPassword);
        $ch    = curl_init(rtrim($this->wpUrl, '/') . "/wp-json/wp/v2/media/{$id}?force=true");
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST  => 'DELETE',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => ["Authorization: Basic {$token}"],
        ]);
        $body   = (string) curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return [$status, $body];
    }
}
