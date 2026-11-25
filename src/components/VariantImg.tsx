import { useState, type ImgHTMLAttributes } from 'react';
import { imageVariant, type ImageSize } from '../lib/image-variant';

/**
 * An uploaded image at the size it's shown: loads the small copy, and the original if the copy isn't there
 * (an image uploaded seconds ago, or before the copies existed). `onError` fires only when the original fails too.
 */
export function VariantImg({ src, size, onError, ...rest }: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & { src: string; size: ImageSize }) {
    const variant = imageVariant(src, size);
    const [missing, setMissing] = useState<string | null>(null);
    const useOriginal = missing === variant;
    return (
        <img
            {...rest}
            src={useOriginal ? src : variant}
            onError={(e) => {
                if (!useOriginal && variant !== src) setMissing(variant);
                else onError?.(e);
            }}
        />
    );
}
