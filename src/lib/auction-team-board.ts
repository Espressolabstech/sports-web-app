import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAuctionTeamBoard } from '../api/adapters/auction';
import { useEventLive } from './auction-live';
import type { AuctionTeamSession } from './auction-team-session';

/** The team board for a logged-in team user, refreshed the moment anything changes (socket signal, no polling). */
export function useTeamBoard(slug: string, session: AuctionTeamSession, logout: () => void) {
    const queryClient = useQueryClient();
    const query = useQuery({
        queryKey: ['auction-team-board', slug, session.token],
        queryFn: () => getAuctionTeamBoard(slug, session.token),
        retry: false,
    });
    useEventLive(slug, () => queryClient.invalidateQueries({ queryKey: ['auction-team-board', slug] }));
    // Removed as a team user (or token no longer valid): back to the login form.
    const status = (query.error as { status?: number } | null)?.status;
    useEffect(() => {
        if (status === 401) logout();
    }, [status, logout]);
    return query;
}
