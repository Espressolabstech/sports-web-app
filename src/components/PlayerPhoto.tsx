import { useState, type ReactNode } from 'react';
import type { ImageSize } from '../lib/image-variant';
import { VariantImg } from './VariantImg';

/** The player's registration photo, filling its parent; the initials (or any fallback) show when there is no photo or it fails to load. */
export function PlayerPhoto({ src, name, fallback, size = 'md' }: { src?: string | null; name: string; fallback: ReactNode; size?: ImageSize }) {
    const [failed, setFailed] = useState<string | null>(null);
    if (!src || failed === src) return <>{fallback}</>;
    return <VariantImg key={src} src={src} size={size} alt={name} className="pp-player-photo" loading="eager" decoding="async" onError={() => setFailed(src)} />;
}
