import { useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAuctionLive, getAuctionPublicView } from '../api/adapters/auction';
import { useAuctionPublicPush, useEventLive } from './auction-live';
import { isWrongCode, useAuctionCode } from './auction-code';

/**
 * The public board, merged from the two public endpoints (no login):
 *  - the public view: every team's purse/spend and every lot's status, team and price;
 *  - the live board: categories, auction state, base prices of the players still to go,
 *    and the photo/levels of the player on the block (and the photo of the last one sold).
 * Both are cached on the server for a few seconds and busted on every auction action,
 * so hundreds of viewers share one database read.
 */
export function toPublicBoard(view: ApiAuctionPublicView, live: ApiAuctionLiveData): ApiAuctionBoardData {
    const liveLots = new Map(live.lots.map((l) => [l.id, l]));
    const categoryByName = new Map(live.categories.map((c) => [c.name, c]));
    const sortOf = new Map(live.teams.map((t) => [t.id, t.sort]));
    const lots: ApiAuctionLot[] = view.lots.map((l) => {
        const detail = liveLots.get(l.id);
        const category = l.category ? categoryByName.get(l.category) : undefined;
        return {
            id: l.id,
            number: l.number,
            name: l.name,
            gender: l.woman ? 'Female' : 'Male',
            categoryId: detail?.categoryId ?? category?.id ?? null,
            status: l.status,
            teamId: l.team,
            priceInr: l.price,
            effectiveBasePriceInr: detail?.effectiveBasePriceInr ?? category?.basePriceInr ?? 0,
            soldAt: l.soldAt,
            // The live board lists every unsold player still to be re-auctioned; an unsold one missing from it was already re-auctioned.
            reauctioned: detail?.reauctioned ?? l.status === 'UNSOLD',
            retained: l.retained,
            corrected: l.corrected,
            photoUrl: detail?.photoUrl,
            padelLevel: detail?.padelLevel,
            pickleballLevel: detail?.pickleballLevel,
        };
    });
    const teams: ApiAuctionTeam[] = view.teams.map((t, i) => ({
        id: t.id,
        name: t.name,
        logoUrl: t.logo,
        purseInr: t.purse,
        spentInr: t.spent,
        remainingInr: t.purse - t.spent,
        sort: sortOf.get(t.id) ?? i,
        squadCount: t.players,
        womenCount: t.women,
    }));
    return { setUp: live.setUp, teams, categories: live.categories, lots, state: live.state, retentionOpen: live.retentionOpen };
}

/**
 * The public board for Live Auction and Squads. The server pushes both halves (public view + live board) the moment
 * anything changes and they're applied at once — no request; the socket signal still refetches as a safety net.
 */
export function usePublicBoard(slug: string) {
    const { code, forget } = useAuctionCode();
    const queryClient = useQueryClient();
    const key = ['auction-public-board', slug, code];
    // The two raw halves, so a push of either one rebuilds the board immediately.
    const parts = useRef<{ view?: ApiAuctionPublicView; live?: ApiAuctionLiveData }>({});
    const query = useQuery({
        queryKey: key,
        queryFn: async () => {
            const [view, live] = await Promise.all([getAuctionPublicView(slug, code), getAuctionLive(slug)]);
            parts.current = { view: view.data, live: live.data };
            return toPublicBoard(view.data, live.data);
        },
        retry: (count, error) => !isWrongCode(error) && count < 2,
    });
    // The code was changed on the server since this device saved it: ask again.
    const wrong = isWrongCode(query.error);
    useEffect(() => {
        if (wrong) forget();
    }, [wrong, forget]);
    const apply = useCallback(
        (patch: { view?: ApiAuctionPublicView; live?: ApiAuctionLiveData }) => {
            parts.current = { ...parts.current, ...patch };
            const { view, live } = parts.current;
            if (!view || !live) return;
            const k = ['auction-public-board', slug, code];
            // An older request still in flight must not overwrite the pushed data.
            void queryClient.cancelQueries({ queryKey: k });
            queryClient.setQueryData(k, toPublicBoard(view, live));
        },
        [queryClient, slug, code],
    );
    useAuctionPublicPush(
        slug,
        wrong ? null : code,
        (view) => apply({ view }),
        (live) => apply({ live }),
    );
    useEventLive(slug, () => queryClient.invalidateQueries({ queryKey: ['auction-public-board', slug] }));
    return query;
}
