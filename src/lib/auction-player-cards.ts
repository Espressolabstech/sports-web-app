import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAuctionPlayerCards } from '../api/adapters/auction';
import { useEventLive } from './auction-live';

/** Every player's photo and levels for the standalone Squads link (null = not needed); refreshed when the organizer changes something. */
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
