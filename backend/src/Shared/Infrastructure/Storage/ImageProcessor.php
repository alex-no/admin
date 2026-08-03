<?php

declare(strict_types=1);

namespace App\Shared\Infrastructure\Storage;

/**
 * Resize and convert images to WebP using GD.
 */
final class ImageProcessor
{
    /**
     * Process raw image content: resize to fit maxSide × maxSide, convert to WebP.
     *
     * @throws \RuntimeException if the image cannot be decoded
     * @return array{content: string, mime: string, ext: string, width: int, height: int}
     */
    public function processToWebp(string $rawContent, int $maxSide = 1920, int $quality = 85): array
    {
        $src = @imagecreatefromstring($rawContent);
        if ($src === false) {
            throw new \RuntimeException('Cannot decode image');
        }

        $origW = imagesx($src);
        $origH = imagesy($src);

        [$newW, $newH] = $this->fitDimensions($origW, $origH, $maxSide);

        if ($newW !== $origW || $newH !== $origH) {
            $dst = imagecreatetruecolor($newW, $newH);
            // Preserve alpha for PNG/WebP
            imagealphablending($dst, false);
            imagesavealpha($dst, true);
            imagecopyresampled($dst, $src, 0, 0, 0, 0, $newW, $newH, $origW, $origH);
            imagedestroy($src);
        } else {
            $dst = $src;
        }

        ob_start();
        imagewebp($dst, null, $quality);
        $webpContent = ob_get_clean();
        imagedestroy($dst);

        if ($webpContent === false || $webpContent === '') {
            throw new \RuntimeException('WebP encoding failed');
        }

        return [
            'content' => $webpContent,
            'mime'    => 'image/webp',
            'ext'     => 'webp',
            'width'   => $newW,
            'height'  => $newH,
        ];
    }

    /** @return array{int, int} */
    private function fitDimensions(int $w, int $h, int $max): array
    {
        if ($w <= $max && $h <= $max) {
            return [$w, $h];
        }
        if ($w >= $h) {
            return [$max, (int) round($h * $max / $w)];
        }
        return [(int) round($w * $max / $h), $max];
    }
}
