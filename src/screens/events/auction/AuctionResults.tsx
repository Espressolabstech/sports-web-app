import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Shuffle } from 'lucide-react';
import { getAuctionTeamBoard } from '../../../api/adapters/auction';
import AuctionTeamLoginGate from '../../../components/events/AuctionTeamLoginGate';
import { useAuctionTeamSession, type AuctionTeamSession } from '../../../lib/auction-team-session';
import { useEventLive } from '../../../lib/auction-live';
import { rupees, MIN_SQUAD, MIN_WOMEN } from '../../../lib/auction';
import { AnimatedLoader } from '../../../components/AnimatedLoader';
import AuctionShell, { TeamLogo } from './AuctionShell';

/** The prototype folds LIVE into the WAITING bucket for its results tabs/counts. */
type ResultStatus = 'SOLD' | 'UNSOLD' | 'WAITING';
const bucket = (status: AuctionLotStatus): ResultStatus => (status === 'LIVE' ? 'WAITING' : status);

function AuctionResultsInner({ slug, session, logout }: { slug: string; session: AuctionTeamSession; logout: () => void }) {
    const queryClient = useQueryClient();
    const [tab, setTab] = useState<'teams' | 'players'>('teams');
    const [status, setStatus] = useState<ResultStatus>('SOLD');
    const [q, setQ] = useState('');

    const { data, isLoading, error } = useQuery({
        queryKey: ['auction-team-board', slug, session.token],
        queryFn: () => getAuctionTeamBoard(slug, session.token),
        retry: false,
    });
    useEventLive(slug, () => queryClient.invalidateQueries({ queryKey: ['auction-team-board', slug] }));

    // Removed as a team user (or token no longer valid): back to the login form.
    useEffect(() => {
        if ((error as { status?: number } | null)?.status === 401) logout();
    }, [error, logout]);

    const board = data?.data;

    const counts = useMemo(() => {
        const c: Record<ResultStatus, number> = { SOLD: 0, UNSOLD: 0, WAITING: 0 };
        board?.lots.forEach((l) => c[bucket(l.status)]++);
        return c;
    }, [board]);

    const rows = useMemo(() => {
        if (!board) return [];
        const needle = q.trim().toLowerCase();
        const lots = board.lots.filter((l) => bucket(l.status) === status);
        // Sold: auction sales in the order they happened, then every retained
        // player together at the bottom (retentions have no sale time).
        if (status === 'SOLD') {
            lots.sort((a, b) => {
                if (a.retained !== b.retained) return a.retained ? 1 : -1;
                if (a.retained) return a.name.localeCompare(b.name);
                return new Date(a.soldAt ?? 0).getTime() - new Date(b.soldAt ?? 0).getTime();
            });
        }
        return lots
            .map((l) => ({ l, t: board.teams.find((t) => t.id === l.teamId) }))
            .filter((r) => !needle || `${r.l.name} ${r.t?.name ?? ''}`.toLowerCase().includes(needle));
    }, [board, q, status]);

    if (isLoading || !board) {
        return (
            <AuctionShell slug={slug} title="TEAM VIEW">
                <div className="flex justify-center py-16">
                    <AnimatedLoader />
                </div>
            </AuctionShell>
        );
    }

    const { teams, lots, categories } = board;
    const statusLabel = (s: ResultStatus) => s[0] + s.slice(1).toLowerCase();

    return (
        <AuctionShell slug={slug} title="TEAM VIEW">
            <div className="auction-tabs" role="tablist" aria-label="Results view">
                {(['teams', 'players'] as const).map((t) => (
                    <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
                        {t === 'teams' ? 'Teams' : 'Players'}
                    </button>
                ))}
            </div>

            {tab === 'teams' ? (
                <div className="auction-team-grid">
                    {teams.map((t) => {
                        const squad = [...lots.filter((l) => l.status === 'SOLD' && l.teamId === t.id)].sort(
                            (a, b) => Number(b.retained) - Number(a.retained),
                        );
                        const barPct = t.purseInr ? Math.min(100, (t.spentInr / t.purseInr) * 100) : 0;
                        return (
                            <article key={t.id} className="auction-team-card">
                                <header>
                                    <TeamLogo name={t.name} logoUrl={t.logoUrl} size={36} />
                                    <div>
                                        <h3>{t.name}</h3>
                                        <span>
                                            {t.squadCount}/{MIN_SQUAD} players · {t.womenCount}/{MIN_WOMEN} women
                                        </span>
                                    </div>
                                </header>
                                <div className="auction-purse">
                                    <span>Remaining purse</span>
                                    <strong>{rupees(t.remainingInr)}</strong>
                                    <small>of {rupees(t.purseInr)}</small>
                                </div>
                                <div className="auction-bar">
                                    <span style={{ width: `${barPct}%` }} />
                                </div>
                                <ul>
                                    {squad.length ? (
                                        squad.map((l) => (
                                            <li key={l.id}>
                                                <span>
                                                    {l.name}
                                                    {l.retained && <span className="pp-status pp-status-info auction-result-badge">Retained</span>}
                                                </span>
                                                <strong>{rupees(l.priceInr ?? 0)}</strong>
                                            </li>
                                        ))
                                    ) : (
                                        <li style={{ color: 'var(--muted-foreground)' }}>No players yet</li>
                                    )}
                                </ul>
                            </article>
                        );
                    })}
                </div>
            ) : (
                <>
                    <div className="auction-toolbar-row">
                        <div className="auction-seg" role="group" aria-label="Player status">
                            {(['SOLD', 'UNSOLD', 'WAITING'] as const).map((s) => (
                                <button key={s} aria-pressed={status === s} onClick={() => setStatus(s)}>
                                    {statusLabel(s)} <span>{counts[s]}</span>
                                </button>
                            ))}
                        </div>
                        <div className="host-search">
                            <Search size={16} />
                            <input aria-label="Search players" placeholder="Search players or teams" value={q} onChange={(e) => setQ(e.target.value)} />
                        </div>
                    </div>
                    {status === 'WAITING' && (
                        <p className="auction-random-note" role="note">
                            <Shuffle size={14} aria-hidden="true" />
                            Players are listed in a random order — this is not the order they will be called in their category.
                        </p>
                    )}
                    <div className="host-table-scroll">
                        <table className="host-table auction-table">
                            <thead>
                                <tr>
                                    <th>Player</th>
                                    <th>Team</th>
                                    <th style={{ textAlign: 'right' }}>Sold for</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(({ l, t }) => {
                                    const category = categories.find((c) => c.id === l.categoryId);
                                    return (
                                        <tr key={l.id}>
                                            <td>
                                                <strong>{l.name}</strong>
                                                {category && <span className="auction-lot-chip">{category.name}</span>}
                                                {l.status === 'LIVE' && <span className="pp-status pp-status-warning auction-result-badge">On the block</span>}
                                                {l.retained && <span className="pp-status pp-status-info auction-result-badge">Retained</span>}
                                            </td>
                                            <td>
                                                {t ? (
                                                    <span className="auction-team-cell">
                                                        <TeamLogo name={t.name} logoUrl={t.logoUrl} size={22} />
                                                        {t.name}
                                                    </span>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{l.priceInr ? rupees(l.priceInr) : '—'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {!rows.length && (
                            <p style={{ padding: 32, textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13 }}>No players here yet</p>
                        )}
                    </div>
                </>
            )}
        </AuctionShell>
    );
}

export default function AuctionResults({ slugOverride }: { slugOverride?: string }) {
    const params = useParams();
    const slug = slugOverride ?? params.slug!;
    const { session, login, logout } = useAuctionTeamSession(slug);
    return (
        <AuctionTeamLoginGate slug={slug} session={session} onLogin={login} title="Team view login">
            {session && <AuctionResultsInner slug={slug} session={session} logout={logout} />}
        </AuctionTeamLoginGate>
    );
}
