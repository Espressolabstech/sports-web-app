import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAuctionPlayerCards } from '../api/adapters/auction';
import { useEventLive } from './auction-live';

/** Every player's photo and levels for the Squads link (null = not needed); refreshed when the organizer changes something. */
export function usePlayerCards(slug: string | null) {
    const queryClient = useQueryClient();
    const query = useQuery({
        queryKey: ['auction-player-cards', slug],
        queryFn: async () => new Map((await getAuctionPlayerCards(slug!)).data.players.map((p) => [p.id, p])),
        enabled: !!slug,
    });
    useEventLive(slug, () => queryClient.invalidateQueries({ queryKey: ['auction-player-cards', slug] }));
    return query.data;
}

/** The code the Squads link asks for. Checked in the browser only (the page's data stays readable by anyone who calls the API directly). */
export const SQUADS_CODE = '4875';

const storageKey = (slug: string) => `pp-squads-code:${slug}`;
/** Remembered on this device, so a returning viewer isn't asked again. */
export function hasSquadsAccess(slug: string): boolean {
    try {
        return localStorage.getItem(storageKey(slug)) === SQUADS_CODE;
    } catch {
        return false;
    }
}
export function rememberSquadsAccess(slug: string) {
    try {
        localStorage.setItem(storageKey(slug), SQUADS_CODE);
    } catch {
        /* storage blocked: they'll be asked again next visit */
    }
}
