import { useState, type ReactNode } from 'react';

/** The player's registration photo, filling its parent; the initials (or any fallback) show when there is no photo or it fails to load. */
export function PlayerPhoto({ src, name, fallback }: { src?: string | null; name: string; fallback: ReactNode }) {
    const [failed, setFailed] = useState<string | null>(null);
    if (!src || failed === src) return <>{fallback}</>;
    return <img src={src} alt={name} className="pp-player-photo" loading="eager" decoding="async" onError={() => setFailed(src)} />;
}
