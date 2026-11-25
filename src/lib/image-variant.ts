/**
 * Uploaded images get small WebP copies next to the original in S3 (made by the image-variants Lambda):
 *   <url>.thumb.webp — 200px (avatars, lists, logos)    <url>.md.webp — 800px (cards, sheets, the live screen)
 * Only our S3 uploads have them; anything else (bundled assets, other hosts) is returned unchanged.
 */
export type ImageSize = 'thumb' | 'md';

const S3_UPLOAD = /^https:\/\/[^/]+\.s3[.-][^/]*amazonaws\.com\//;
const VARIANT = /\.(thumb|md)\.webp$/;

export function imageVariant(url: string, size: ImageSize): string {
    if (!S3_UPLOAD.test(url) || VARIANT.test(url)) return url;
    return `${url}.${size}.webp`;
}
