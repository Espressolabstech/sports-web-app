import { createContext, useContext } from 'react';

/**
 * The code the Live Auction and Squads pages ask for. The server checks it (it isn't in the website's files);
 * this device remembers the one that worked so every auction page of the event opens without asking again.
 */
export const AuctionCodeContext = createContext<{ code: string; forget: () => void } | null>(null);

/** The code the viewer unlocked the page with, and a way to ask again when the server stops accepting it. */
export function useAuctionCode() {
    return useContext(AuctionCodeContext) ?? { code: '', forget: () => undefined };
}

const storageKey = (slug: string) => `pp-squads-code:${slug}`;

export function savedAuctionCode(slug: string): string | null {
    try {
        return localStorage.getItem(storageKey(slug));
    } catch {
        return null;
    }
}

export function rememberAuctionCode(slug: string, code: string | null) {
    try {
        if (code) localStorage.setItem(storageKey(slug), code);
        else localStorage.removeItem(storageKey(slug));
    } catch {
        /* storage blocked: they'll be asked again next visit */
    }
}

/** A rejected code (403) — anything else (network, 5xx) shouldn't throw the viewer back to the code screen. */
export const isWrongCode = (error: unknown) => (error as { status?: number } | null)?.status === 403;
