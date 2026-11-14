import { useState } from 'react';

/** Shared across every page scoped to one event's host-viewer login (host
 *  preview, auction control, auction admin) — never the app's own shared
 *  player/organizer session token, so it can't collide with one on the same
 *  device. */
export const hostViewerTokenKeyFor = (slug: string) => `host-preview-token:${slug}`;

export function useHostViewerToken(slug: string | null) {
    const [token, setToken] = useState<string | null>(() => (slug ? localStorage.getItem(hostViewerTokenKeyFor(slug)) : null));

    const logout = () => {
        if (slug) localStorage.removeItem(hostViewerTokenKeyFor(slug));
        setToken(null);
    };

    const login = (newToken: string) => {
        if (slug) localStorage.setItem(hostViewerTokenKeyFor(slug), newToken);
        setToken(newToken);
    };

    return { token, login, logout };
}
