import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAuctionLive } from '../../../api/adapters/auction';
import { useAuctionLivePush, useEventLive } from '../../../lib/auction-live';
import { rupees, nextUp, nextCategory, reauctionPool, roundLabel } from '../../../lib/auction';
import { AnimatedLoader } from '../../../components/AnimatedLoader';
import AuctionShell, { TeamLogo } from './AuctionShell';
import { AuctionLotBreak, AuctionWaiting, AuctionSold } from './AuctionMoments';
import { AuctionLivePlayer } from './AuctionLivePlayer';

const SOLD_MOMENT_MS = 6500;

export default function AuctionLive({ slugOverride }: { slugOverride?: string }) {
    const params = useParams();
    const slug = slugOverride ?? params.slug!;
    const queryClient = useQueryClient();
    const { data, isLoading, error } = useQuery({
        queryKey: ['auction-live', slug],
        queryFn: () => getAuctionLive(slug),
        retry: false,
    });
    // The server pushes the new board over the socket the moment anything changes — no refetch round trip.
    useAuctionLivePush(
        slug,
        (board) => {
            queryClient.setQueryData(['auction-live', slug], (old: typeof data) => (old ? { ...old, data: board as ApiAuctionLiveData } : old));
        },
        () => void queryClient.invalidateQueries({ queryKey: ['auction-live', slug] }),
    );
    // The "changed" ping reloads the board straight away too (exactly as before the push existed), so the screen can never be
    // slower than that. The server shares one database read between the push and this reload, so it costs nothing extra.
    useEventLive(slug, () => void queryClient.invalidateQueries({ queryKey: ['auction-live', slug] }));

    // A once-a-second clock, read at render time instead of calling Date.now() directly.
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, []);

    const board = data?.data;
    const lots = board?.lots ?? [];
    const last = [...lots]
        .filter((l) => l.status === 'SOLD' && !l.retained && !l.corrected && l.soldAt)
        .sort((a, b) => (b.soldAt ?? '').localeCompare(a.soldAt ?? ''))[0];
    const lastTeam = board?.teams.find((t) => t.id === last?.teamId);

    // The celebratory "SOLD" moment shows for ~6.5s right after a sale, then falls back to the waiting / lot-break screen.
    const msSinceSold = last?.soldAt ? now - new Date(last.soldAt).getTime() : Infinity;

    if (error) {
        return (
            <AuctionShell slug={slug} kicker="THE COURT COLLECTIVE 2026 · PLAYER AUCTION" title="THE PLAYER AUCTION">
                <section className="auction-panel">
                    <h2>No auction for this event</h2>
                    <p className="text-muted-foreground" style={{ fontSize: 13, marginTop: 6 }}>
                        {(error as { message?: string }).message || 'The auction isn’t available.'}
                    </p>
                </section>
            </AuctionShell>
        );
    }

    if (isLoading || !board) {
        return (
            <AuctionShell slug={slug} kicker="THE COURT COLLECTIVE 2026 · PLAYER AUCTION" title="THE PLAYER AUCTION">
                <div className="auction-stage auction-empty">
                    <AnimatedLoader />
                </div>
            </AuctionShell>
        );
    }

    const { categories, state } = board;
    const current = lots.find((l) => l.id === state.currentLotId);
    const next = nextUp(lots, state, categories);
    // The player's own category (in rounds mode there's no single open category).
    const category = categories.find((c) => c.id === (current?.categoryId ?? state.currentCategoryId));
    const stage = roundLabel(state.round) ?? (state.phase === 'REAUCTION' ? 'Re-auction round' : categories.find((c) => c.id === state.currentCategoryId)?.name);
    const upcoming =
        !state.round && state.phase === 'CATEGORIES'
            ? (nextCategory(categories, lots, state.currentCategoryId)?.name ?? (reauctionPool(lots).length ? 'Re-auction round' : undefined))
            : undefined;
    // The public board only carries the lots the screen needs, so totals come from counts.
    const sold = board.counts.sold;
    const total = board.counts.total;
    const celebrating = !current && Boolean(last) && msSinceSold < SOLD_MOMENT_MS;

    return (
        <AuctionShell
            slug={slug}
            isLive={!!current}
            kicker="THE COURT COLLECTIVE 2026 · PLAYER AUCTION"
            title={celebrating ? 'WELCOME TO THE TEAM' : current ? 'NOW ON THE BLOCK' : 'THE PLAYER AUCTION'}
            right={
                <span className={`pp-status pp-status-${current ? 'warning' : celebrating ? 'success' : 'neutral'}`}>
                    {current ? 'On the block' : celebrating ? 'Sold' : 'Between players'}
                </span>
            }
        >
            {celebrating && last ? (
                <AuctionSold lot={last} teamName={lastTeam?.name} teamLogoUrl={lastTeam?.logoUrl} />
            ) : current ? (
                <AuctionLivePlayer key={current.id} lot={current} categoryName={category?.name} reauction={state.phase === 'REAUCTION' || current.reauctioned} />
            ) : next ? (
                <AuctionWaiting sold={sold} total={total} label={stage} />
            ) : (
                <AuctionLotBreak done={stage} upcoming={upcoming} sold={sold} total={total} />
            )}

            {last && (
                <div className="auction-last">
                    <span className="auction-last-label">LAST SOLD</span>
                    <strong className="auction-last-player">{last.name}</strong>
                    <span className="auction-last-team">
                        <TeamLogo name={lastTeam?.name ?? ''} logoUrl={lastTeam?.logoUrl ?? null} size={22} />
                        <span>{lastTeam?.name}</span>
                    </span>
                    <strong className="auction-last-price text-foreground">{rupees(last.priceInr ?? 0)}</strong>
                </div>
            )}
        </AuctionShell>
    );
}
