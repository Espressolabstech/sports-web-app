import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import AuctionTeamLoginGate from '../../../components/events/AuctionTeamLoginGate';
import { useAuctionTeamSession, type AuctionTeamSession } from '../../../lib/auction-team-session';
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/pp-ui';
import { AnimatedLoader } from '../../../components/AnimatedLoader';
import { filterAuctionLots, rupees } from '../../../lib/auction';
import { useIncremental } from '../../../lib/use-incremental';
import AuctionShell from './AuctionShell';
import { HubSquadBoard } from './AuctionTeamHub';
import { toHubData } from './hub-data';
import { useTeamBoard } from '../../../lib/auction-team-board';
import { statuses, statusKey } from './auction-statuses';

type Tab = 'teams' | 'players';
const STATUSES = ['all', 'live', 'retained', 'unsold', 'waiting', 'sold'] as const;

function SquadsInner({ slug, session, logout }: { slug: string; session: AuctionTeamSession; logout: () => void }) {
    // Tab and status live in the URL (?tab=teams&status=sold), so a shared link opens the same view.
    const [params, setParams] = useSearchParams();
    const tab: Tab = params.get('tab') === 'teams' ? 'teams' : 'players';
    const status = (STATUSES as readonly string[]).includes(params.get('status') ?? '') ? params.get('status')! : 'all';
    const set = (v: Partial<{ tab: Tab; status: string }>) =>
        setParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                Object.entries(v).forEach(([k, val]) => next.set(k, val));
                return next;
            },
            { replace: true },
        );
    const [q, setQ] = useState('');
    const [category, setCategory] = useState('all');
    const [gender, setGender] = useState('all');

    const { data, isLoading } = useTeamBoard(slug, session, logout);
    const board = data?.data;
    const lots = board?.lots ?? [];
    const teams = board?.teams ?? [];
    const rows = filterAuctionLots(lots, { category, gender, status, search: '' })
        .map((l) => ({ l, t: teams.find((t) => t.id === l.teamId) }))
        .filter((r) => !q.trim() || `${r.l.name} ${r.l.number ?? ''} ${r.t?.name ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()));
    // Hundreds of players: a page of tiles at a time, the next page as you scroll.
    const { visible, hasMore, sentinel } = useIncremental(rows, `${category}|${gender}|${status}|${q}`);

    const liveGroup = board?.categories.find((g) => g.id === board.state.currentCategoryId)?.name;
    const right = (
        <div className="flex items-center gap-3">
            {board?.state.currentLotId && liveGroup ? (
                <span className="auction-live-dot">
                    <span />
                    {liveGroup} · LIVE
                </span>
            ) : null}
            <div className="auction-tabs is-inline" role="tablist" aria-label="Auction view">
                {(['teams', 'players'] as const).map((t) => (
                    <Button variant="ghost" key={t} role="tab" aria-selected={tab === t} onClick={() => set({ tab: t })}>
                        {t === 'teams' ? 'Teams' : 'Players'}
                    </Button>
                ))}
            </div>
        </div>
    );
    const title = tab === 'teams' ? 'TEAMS' : 'PLAYERS';

    if (isLoading || !board) {
        return (
            <AuctionShell slug={slug} title={title} right={right}>
                <div className="flex justify-center py-16">
                    <AnimatedLoader />
                </div>
            </AuctionShell>
        );
    }

    return (
        <AuctionShell slug={slug} isLive={!!board.state.currentLotId} title={title} right={right}>
            {tab === 'teams' ? (
                <HubSquadBoard a={toHubData(board)} />
            ) : (
                <>
                    <div className="auction-lot-tabs" aria-label="Player categories">
                        <Button variant="outline" aria-pressed={category === 'all'} onClick={() => setCategory('all')}>
                            All categories
                        </Button>
                        {board.categories.map((g) => (
                            <Button key={g.id} variant="outline" aria-pressed={category === g.id} onClick={() => setCategory(g.id)}>
                                {g.name} <span>{lots.filter((l) => l.categoryId === g.id).length}</span>
                            </Button>
                        ))}
                        <Button variant="outline" aria-pressed={category === 'none'} onClick={() => setCategory('none')}>
                            Unassigned
                        </Button>
                    </div>
                    <div className="pp-draw-filters">
                        <div className="host-search">
                            <Search size={16} />
                            <Input aria-label="Search players" placeholder="Player number, name or team" value={q} onChange={(e) => setQ(e.target.value)} />
                        </div>
                        <Select value={status} onValueChange={(v) => set({ status: v })}>
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
                        {visible.map(({ l, t }) => {
                            const s = statuses[statusKey(l)];
                            const no = String(l.number ?? 0).padStart(3, '0');
                            return (
                                <div key={l.id} className="pp-number-tile rounded-lg border" aria-label={`Player ${no}, ${l.name}, ${s.text}`}>
                                    <div className="pp-number-top">
                                        <strong>{no}</strong>
                                        <span className={`pp-status pp-status-${s.tone}`}>
                                            <s.Icon size={12} />
                                            {s.text}
                                        </span>
                                    </div>
                                    <span className="pp-number-name">{l.name}</span>
                                    <span className="pp-number-detail">
                                        {board.categories.find((g) => g.id === l.categoryId)?.name ?? 'Unassigned'} ·{' '}
                                        {l.gender === 'Female' ? <span className="pp-female-text">Female</span> : 'Male'}
                                    </span>
                                    <span className="pp-number-price">
                                        {l.status === 'SOLD' ? rupees(l.priceInr ?? 0) : rupees(l.effectiveBasePriceInr)}
                                        {l.status === 'SOLD' && <small>{t?.name}</small>}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                    {hasMore && <div ref={sentinel} className="pp-list-more" aria-hidden="true" />}
                    {!rows.length && <p className="p-8 text-center text-muted-foreground text-sm">No players here yet</p>}
                </>
            )}
        </AuctionShell>
    );
}

/** Squads: every team's 12 slots, or every auction player by category, status and gender. Team users only. */
export default function AuctionSquads({ slugOverride }: { slugOverride?: string }) {
    const params = useParams();
    const slug = slugOverride ?? params.slug!;
    const { session, login, logout } = useAuctionTeamSession(slug);
    return (
        <AuctionTeamLoginGate slug={slug} session={session} onLogin={login} title="Squads login">
            {session && <SquadsInner slug={slug} session={session} logout={logout} />}
        </AuctionTeamLoginGate>
    );
}
