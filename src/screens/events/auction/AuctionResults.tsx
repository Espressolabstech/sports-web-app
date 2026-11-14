import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { getAuctionTeamBoard } from '../../../api/adapters/auction';
import AuctionTeamLoginGate from '../../../components/events/AuctionTeamLoginGate';
import { useAuctionTeamSession, type AuctionTeamSession } from '../../../lib/auction-team-session';
import { useEventLive } from '../../../lib/auction-live';
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/pp-ui';
import { AnimatedLoader } from '../../../components/AnimatedLoader';
import { filterAuctionLots, rupees } from '../../../lib/auction';
import AuctionShell from './AuctionShell';
import { AuctionTeamCards } from './AuctionTeamCards';
import { AuctionTeamInsights } from './AuctionTeamInsights';
import { statuses, statusKey } from './auction-statuses';

type Tab = 'teams' | 'players' | 'insights';
const TABS: { value: Tab; label: string }[] = [
    { value: 'teams', label: 'Teams' },
    { value: 'players', label: 'Players' },
    { value: 'insights', label: 'Insights' },
];

function AuctionResultsInner({ slug, session, logout }: { slug: string; session: AuctionTeamSession; logout: () => void }) {
    const queryClient = useQueryClient();
    const [tab, setTab] = useState<Tab>('teams');
    const [status, setStatus] = useState('sold');
    const [q, setQ] = useState('');
    const [category, setCategory] = useState('all');
    const [gender, setGender] = useState('all');

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
    if (isLoading || !board) {
        return (
            <AuctionShell slug={slug} kicker="THE COURT COLLECTIVE 2026 · PLAYER AUCTION" title="TEAM HUB">
                <div className="flex justify-center py-16">
                    <AnimatedLoader />
                </div>
            </AuctionShell>
        );
    }

    const { teams, lots, categories } = board;
    // Searching also matches the buying team's name.
    const rows = filterAuctionLots(lots, { category, gender, status, search: '' })
        .map((l) => ({ l, t: teams.find((t) => t.id === l.teamId) }))
        .filter((r) => !q.trim() || `${r.l.name} ${r.l.number ?? ''} ${r.t?.name ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()));

    return (
        <AuctionShell slug={slug} isLive={!!board.state.currentLotId} kicker="THE COURT COLLECTIVE 2026 · PLAYER AUCTION" title="TEAM HUB">
            <div className="auction-tabs" role="tablist" aria-label="Results view">
                {TABS.map((t) => (
                    <Button variant="ghost" key={t.value} role="tab" aria-selected={tab === t.value} onClick={() => setTab(t.value)}>
                        {t.label}
                    </Button>
                ))}
            </div>
            {tab === 'insights' ? (
                <AuctionTeamInsights teams={teams} categories={categories} lots={lots} />
            ) : tab === 'teams' ? (
                <AuctionTeamCards teams={teams} lots={lots} />
            ) : (
                <>
                    <div className="auction-lot-tabs" aria-label="Player categories">
                        <Button variant="outline" aria-pressed={category === 'all'} onClick={() => setCategory('all')}>
                            All categories
                        </Button>
                        {categories.map((g) => (
                            <Button key={g.id} variant="outline" aria-pressed={category === g.id} onClick={() => setCategory(g.id)}>
                                {g.name} <span>{lots.filter((l) => l.categoryId === g.id).length}</span>
                            </Button>
                        ))}
                    </div>
                    <div className="pp-draw-filters">
                        <div className="host-search">
                            <Search size={16} />
                            <Input aria-label="Search players" placeholder="Player number, name or team" value={q} onChange={(e) => setQ(e.target.value)} />
                        </div>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger aria-label="Auction status">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="pp-console pp-menu">
                                <SelectItem value="all">All statuses</SelectItem>
                                <SelectItem value="waiting">Waiting</SelectItem>
                                <SelectItem value="live">On block</SelectItem>
                                <SelectItem value="sold">Sold</SelectItem>
                                <SelectItem value="unsold">Unsold</SelectItem>
                                <SelectItem value="retained">Retained</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={gender} onValueChange={setGender}>
                            <SelectTrigger aria-label="Player gender">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="pp-console pp-menu">
                                <SelectItem value="all">All genders</SelectItem>
                                <SelectItem value="Male">Male</SelectItem>
                                <SelectItem value="Female">Female</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="pp-draw-legend">
                        {Object.values(statuses).map((s) => (
                            <span key={s.text} className={`pp-status pp-status-${s.tone}`}>
                                <s.Icon size={12} />
                                {s.text}
                            </span>
                        ))}
                    </div>
                    <div className="pp-number-grid">
                        {rows.map(({ l, t }) => {
                            const s = statuses[statusKey(l)];
                            return (
                                <div key={l.id} className="pp-number-tile rounded-lg border" aria-label={`Player ${l.number}, ${l.name}, ${s.text}`}>
                                    <div className="pp-number-top">
                                        <strong>{String(l.number ?? 0).padStart(3, '0')}</strong>
                                        <span className={`pp-status pp-status-${s.tone}`}>
                                            <s.Icon size={12} />
                                            {s.text}
                                        </span>
                                    </div>
                                    <span className="pp-number-name">{l.name}</span>
                                    <span className="pp-number-detail">
                                        {categories.find((g) => g.id === l.categoryId)?.name ?? 'Unassigned'} · {l.gender === 'Female' ? 'Female' : 'Male'}
                                    </span>
                                    <span className="pp-number-price">
                                        {l.status === 'SOLD' ? rupees(l.priceInr ?? 0) : rupees(l.effectiveBasePriceInr)}
                                        {l.status === 'SOLD' && <small>{t?.name}</small>}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                    {!rows.length && <p className="p-8 text-center text-muted-foreground text-sm">No players here yet</p>}
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
        <AuctionTeamLoginGate slug={slug} session={session} onLogin={login} title="Team Hub login">
            {session && <AuctionResultsInner slug={slug} session={session} logout={logout} />}
        </AuctionTeamLoginGate>
    );
}
