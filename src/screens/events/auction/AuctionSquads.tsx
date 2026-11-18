import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/pp-ui';
import { AnimatedLoader } from '../../../components/AnimatedLoader';
import { filterAuctionLots, rupees } from '../../../lib/auction';
import { useIncremental } from '../../../lib/use-incremental';
import AuctionShell from './AuctionShell';
import { HubSquadBoard } from './AuctionTeamHub';
import { toHubData } from './hub-data';
import { usePublicBoard } from '../../../lib/auction-team-board';
import { statuses, statusKey } from './auction-statuses';

type Tab = 'teams' | 'players';
const STATUSES = ['all', 'live', 'retained', 'unsold', 'waiting', 'sold'] as const;

function SquadsInner({ slug }: { slug: string }) {
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

    const { data: board } = usePublicBoard(slug);
    const lots = board?.lots ?? [];
    const teams = board?.teams ?? [];
    const rows = filterAuctionLots(lots, { category, gender, status, search: '' })
        .map((l) => ({ l, t: teams.find((t) => t.id === l.teamId) }))
        .filter((r) => !q.trim() || `${r.l.name} ${r.l.number ?? ''} ${r.t?.name ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()));
    // Hundreds of players: a page of tiles at a time, the next page as you scroll.
    const { visible, hasMore, sentinel } = useIncremental(rows, `${category}|${gender}|${status}|${q}`);
    // Same "active filters — N players" line as the organizer console's Player Hub.
    const selectedStatus = statuses[status as keyof typeof statuses];
    const activeFilters = [
        { key: 'category', active: category !== 'all', label: category === 'none' ? 'Unassigned' : board?.categories.find((g) => g.id === category)?.name, clear: () => setCategory('all'), Icon: null },
        { key: 'status', active: status !== 'all', label: selectedStatus?.text, clear: () => set({ status: 'all' }), Icon: selectedStatus?.Icon ?? null },
        { key: 'gender', active: gender !== 'all', label: gender === 'Female' ? 'Female' : 'Male', clear: () => setGender('all'), Icon: null },
        { key: 'search', active: !!q.trim(), label: `“${q.trim()}”`, clear: () => setQ(''), Icon: null },
    ].filter((f) => f.active);

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

    if (!board) {
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
                            Unassigned <span>{lots.filter((l) => !l.categoryId).length}</span>
                        </Button>
                    </div>
                    <div className="pp-draw-filters">
                        <div className="host-search">
                            <Search size={16} />
                            <Input aria-label="Search player numbers" placeholder="Player number or name" value={q} onChange={(e) => setQ(e.target.value)} />
                        </div>
                        <Select value={status} onValueChange={(v) => set({ status: v })}>
                            <SelectTrigger aria-label="Auction status">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="pp-console pp-menu">
                                <SelectItem value="all">All statuses</SelectItem>
                                {Object.entries(statuses).map(([value, s]) => (
                                    <SelectItem value={value} key={value}>
                                        <span className="flex items-center gap-2">
                                            <s.Icon size={14} aria-hidden />
                                            {s.text}
                                        </span>
                                    </SelectItem>
                                ))}
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
                    <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        {activeFilters.length ? (
                            activeFilters.map((f) => (
                                <span key={f.key} className="inline-flex min-w-0 max-w-full items-center gap-1">
                                    {f.Icon && <f.Icon size={14} className="shrink-0" aria-hidden />}
                                    <span className="min-w-0 break-words">{f.label}</span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 shrink-0 [&_svg]:size-3"
                                        aria-label={`Clear ${f.label} filter`}
                                        title={`Clear ${f.label} filter`}
                                        onClick={f.clear}
                                    >
                                        <X aria-hidden />
                                    </Button>
                                </span>
                            ))
                        ) : (
                            <span>All players</span>
                        )}
                        <span aria-hidden>—</span>
                        <strong className="font-semibold text-foreground" role="status" aria-live="polite" aria-atomic="true">
                            {rows.length} {rows.length === 1 ? 'player' : 'players'}
                        </strong>
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
                    {!rows.length && <p className="py-10 text-center text-muted-foreground">No players match these filters.</p>}
                </>
            )}
        </AuctionShell>
    );
}

/** Squads: every team's 12 slots, or every auction player by category, status and gender. Public, no login. */
export default function AuctionSquads({ slugOverride }: { slugOverride?: string }) {
    const params = useParams();
    return <SquadsInner slug={slugOverride ?? params.slug!} />;
}
