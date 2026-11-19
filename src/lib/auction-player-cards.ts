import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAuctionPlayerCards } from '../api/adapters/auction';
import { useEventLive } from './auction-live';
import { isWrongCode, useAuctionCode } from './auction-code';

/** Every player's photo and levels for the Squads link (null = not needed); refreshed when the organizer changes something. */
export function usePlayerCards(slug: string | null) {
    const { code, forget } = useAuctionCode();
    const queryClient = useQueryClient();
    const query = useQuery({
        queryKey: ['auction-player-cards', slug, code],
        queryFn: async () => new Map((await getAuctionPlayerCards(slug!, code)).data.players.map((p) => [p.id, p])),
        enabled: !!slug && !!code,
        retry: (count, error) => !isWrongCode(error) && count < 2,
    });
    const wrong = isWrongCode(query.error);
    useEffect(() => {
        if (wrong) forget();
    }, [wrong, forget]);
    useEventLive(slug, () => queryClient.invalidateQueries({ queryKey: ['auction-player-cards', slug] }));
    return query.data;
}
