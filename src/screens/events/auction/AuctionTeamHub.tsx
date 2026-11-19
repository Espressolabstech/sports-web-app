import { useEffect, useState, type KeyboardEvent } from 'react';
import { Button, Dialog, DialogDescription, DialogHeader, DialogTitle, SheetContent } from '../../../components/pp-ui';
import { MIN_SQUAD, nextCategory, nextUp, reauctionPool, roundLabel, rupees, spentBy } from '../../../lib/auction';
import { bidBudget, FEMALE_MIN, isFemale, squadDots, squadSlots, SQUAD_MAX, type BudgetTeam } from '../../../lib/auction-bid-budget';
import { auctionFacts, formatTimes, teamStats } from '../../../lib/auction-hub-stats';
import { AuctionLivePlayer } from './AuctionLivePlayer';
import { AuctionLotBreak, AuctionSold, AuctionWaiting } from './AuctionMoments';
import { TeamLogo } from './AuctionShell';

import type { HubData, HubTeam } from './hub-data';
type Budget = ReturnType<typeof bidBudget>;

const SOLD_MOMENT_MS = 6500;

/** The latest auction sale, and whether its ~6.5s "sold" moment is still running. */
function useSaleMoment(a: HubData) {
    const last = [...(a.lots as ApiAuctionLot[])]
        .filter((l) => l.status === 'SOLD' && !l.retained && !l.corrected && l.soldAt)
        .sort((x, y) => (y.soldAt ?? '').localeCompare(x.soldAt ?? ''))[0];
    // The clock only moves when the moment should end, so a fresh sale shows straight away and clears on time.
    const [now, setNow] = useState(() => Date.now());
    const lastKey = last ? `${last.id}-${last.soldAt}` : null;
    const soldTime = last?.soldAt ? new Date(last.soldAt).getTime() : 0;
    useEffect(() => {
        if (!lastKey) return;
        const remaining = SOLD_MOMENT_MS - (Date.now() - soldTime);
        if (remaining <= 0) return;
        const timer = setTimeout(() => setNow(Date.now()), remaining);
        return () => clearTimeout(timer);
    }, [lastKey, soldTime]);
    return { last, lastKey, active: !!lastKey && now - soldTime < SOLD_MOMENT_MS };
}

export function HubTop({ a }: { a: HubData }) {
    const live = (a.lots as ApiAuctionLot[]).find((l) => l.id === a.currentId);
    const { last, active } = useSaleMoment(a);
    const sold = a.lots.filter((l) => l.status === 'SOLD').length;
    const state = { currentLotId: a.currentId, currentCategoryId: a.currentGroupId, phase: a.phase, round: a.round as ApiAuctionState['round'] };
    const next = nextUp(a.lots, state, a.groups);
    const stage = roundLabel(state.round) ?? (a.phase === 'REAUCTION' ? 'Re-auction round' : a.groups.find((g) => g.id === a.currentGroupId)?.name);
    // Rounds are opened by the organizer in any order, so there's no fixed "up next" round to announce.
    const upcoming =
        !state.round && a.phase === 'CATEGORIES'
            ? (nextCategory(a.groups, a.lots, a.currentGroupId)?.name ?? (reauctionPool(a.lots).length ? 'Re-auction round' : undefined))
            : undefined;
    const celebrating = !live && last && active;
    const lastTeam = a.teams.find((t) => t.id === last?.teamId);
    return (
        <section className="hub-block" aria-label="On the block">
            <header className="hub-block-heading">
                <span className="hub-label">On the block</span>
                <span className={`pp-status pp-status-${live ? 'warning' : celebrating ? 'success' : 'neutral'}`}>
                    {live ? 'On the block' : celebrating ? 'Sold' : 'Between players'}
                </span>
            </header>
            {live ? (
                <AuctionLivePlayer
                    key={live.id}
                    lot={live}
                    categoryName={a.groups.find((g) => g.id === live.categoryId)?.name}
                    reauction={a.phase === 'REAUCTION' || !!live.reauctioned}
                />
            ) : celebrating ? (
                <AuctionSold lot={last} teamName={lastTeam?.name} teamLogoUrl={lastTeam?.logoUrl} />
            ) : next ? (
                <AuctionWaiting sold={sold} total={a.lots.length} label={stage} />
            ) : (
                <AuctionLotBreak done={stage} upcoming={upcoming} sold={sold} total={a.lots.length} />
            )}
        </section>
    );
}

export function PurseBar({ team, spent, b }: { team: BudgetTeam; spent: number; b: Budget }) {
    const pct = (n: number) => `${team.purseInr ? (Math.max(0, n) / team.purseInr) * 100 : 0}%`;
    const bid = b.maxBid ?? 0;
    return (
        <div className="hub-purse">
            <div className="hub-bar" role="img" aria-label={`${rupees(spent)} spent, ${rupees(bid)} can bid now, ${rupees(b.reserve)} kept to finish squad`}>
                <span className="seg-spent" style={{ width: pct(spent) }} />
                <span className="seg-bid" style={{ width: pct(bid) }} />
                <span className="seg-keep" style={{ width: pct(Math.min(b.reserve, b.remaining - bid)) }} />
            </div>
            <div className="hub-purse-foot">
                <span>{rupees(spent)} spent</span>
                <span>{rupees(b.remaining)} left</span>
            </div>
        </div>
    );
}

function Dots({ b }: { b: Budget }) {
    return (
        <div className="hub-dots" aria-hidden="true">
            {squadDots(b.maleOwned, b.femaleOwned).map((d, i) => (
                <i key={i} className={`d-${d}`} />
            ))}
        </div>
    );
}

function Tile({ team, a, onOpen, celebrating = false }: { team: HubTeam; a: HubData; onOpen: () => void; celebrating?: boolean }) {
    const b = bidBudget(team, a);
    const live = !!a.currentId;
    const out = live && (b.outReason || b.maxBid === null);
    return (
        <Button
            variant="outline"
            className={`hub-card hub-tile${out ? ' is-out' : ''}${celebrating ? ' hub-team-celebrating' : ''}`}
            onClick={onOpen}
            aria-label={`${team.name} details`}
        >
            <header>
                <TeamLogo name={team.name} logoUrl={team.logoUrl} size={32} />
                <h3>{team.name}</h3>
            </header>
            <div className="hub-money">
                {out ? (
                    <>
                        <span className="hub-label text-warning">Out for this player</span>
                        <strong className="hub-reason">{b.outReason ?? 'Squad at risk'}</strong>
                    </>
                ) : (
                    <>
                        <span className="hub-label">{live ? 'Can bid up to' : 'Max bid'}</span>
                        <strong className="hub-big">{b.maxBid === null ? '—' : rupees(b.maxBid)}</strong>
                    </>
                )}
                <PurseBar team={team} spent={spentBy(team.id, a.lots)} b={b} />
            </div>
            <div className="hub-squad">
                <div className="hub-squad-head">
                    <span>
                        Squad {b.squad}/{MIN_SQUAD}
                    </span>
                    {b.femaleNeeded > 0 && <span className="hub-female">Needs {b.femaleNeeded} female</span>}
                </div>
                <Dots b={b} />
            </div>
        </Button>
    );
}

export function HubLegend() {
    return (
        <div className="hub-legend">
            <span>
                <i className="l-spent" />
                Spent
            </span>
            <span>
                <i className="l-bid" />
                Can bid now
            </span>
            <span>
                <i className="l-keep" />
                Kept to finish squad
            </span>
            <b aria-hidden="true">|</b>
            <span>
                <i className="d-male" />
                Male
            </span>
            <span>
                <i className="d-female" />
                Female
            </span>
            <span>
                <i className="d-open" />
                Open
            </span>
            <span>
                <i className="d-need" />
                Female needed
            </span>
        </div>
    );
}

export function HubTiles({ a }: { a: HubData }) {
    const [open, setOpen] = useState<string | null>(null);
    const { last, lastKey, active } = useSaleMoment(a);
    const teams = a.teams.slice().sort((x, y) => x.sort - y.sort);
    const team = teams.find((t) => t.id === open);
    return (
        <>
            <div className="hub-tiles">
                {teams.map((t) => (
                    <Tile
                        key={`${t.id}-${last?.teamId === t.id ? lastKey : ''}`}
                        team={t}
                        a={a}
                        celebrating={active && last?.teamId === t.id}
                        onOpen={() => setOpen(t.id)}
                    />
                ))}
            </div>
            <HubLegend />
            <Dialog open={!!team} onOpenChange={(o) => !o && setOpen(null)}>
                <SheetContent className="hub-sheet">{team && <TeamDetail team={team} a={a} />}</SheetContent>
            </Dialog>
        </>
    );
}

/** Category badge letter: the trailing letter of the category name ("Category D" -> D). */
const catLetter = (name: string) => {
    const t = name.replace(/[^A-Za-z]/g, '');
    return t ? t.slice(-1).toUpperCase() : '—';
};

function SquadColumn({
    team,
    a,
    latestId,
    onOpen,
    onPlayer,
}: {
    team: HubTeam;
    a: HubData;
    latestId: string | null;
    onOpen: () => void;
    onPlayer?: (lotId: string) => void;
}) {
    const b = bidBudget(team, a);
    const squad = a.lots
        .filter((l) => l.status === 'SOLD' && l.teamId === team.id)
        .sort((x, y) => Number(!!y.retained) - Number(!!x.retained) || (x.soldAt ?? '').localeCompare(y.soldAt ?? ''));
    const slots = squadSlots(squad, Math.max(0, FEMALE_MIN - b.femaleOwned));
    const full = squad.length >= MIN_SQUAD;
    const count =
        squad.length >= SQUAD_MAX ? (
            <span className="is-full">Full · {squad.length}</span>
        ) : full ? (
            <span className="is-full">
                {squad.length}/{MIN_SQUAD}
            </span>
        ) : (
            <span>
                {squad.length}/{MIN_SQUAD}
            </span>
        );
    return (
        <article className="hub-squad-col">
            <Button variant="ghost" className="hub-board-team" onClick={onOpen} aria-label={`${team.name} details`}>
                <TeamLogo name={team.name} logoUrl={team.logoUrl} size={34} />
                <div>
                    <h3>{team.name}</h3>
                </div>
                <span className="hub-board-left">
                    <strong>{rupees(b.remaining)}</strong>
                    <small>left</small>
                </span>
            </Button>
            <ul className="hub-squad-slots" aria-label={`${team.name} squad slots`}>
                {slots.map((s) => {
                    const opt = s.optional ? ' is-optional' : '';
                    if (!s.lot)
                        return (
                            <li key={s.n} className={`hub-slot${s.need ? ' is-need' : ''}${opt}`}>
                                <span className="hub-slot-num">{s.n}</span>
                                {s.need ? <span className="hub-slot-need">Female needed</span> : s.optional ? <span className="hub-slot-opt">Optional</span> : null}
                            </li>
                        );
                    const g = a.groups.find((x) => x.id === s.lot?.categoryId);
                    const female = isFemale(s.lot);
                    const newest = s.lot.id === latestId;
                    const lotId = s.lot.id;
                    // On the standalone Squads link a filled slot opens that player's card.
                    const open = onPlayer && {
                        role: 'button',
                        tabIndex: 0,
                        'aria-label': `${s.lot.name} details`,
                        onClick: () => onPlayer(lotId),
                        onKeyDown: (e: KeyboardEvent) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onPlayer(lotId);
                            }
                        },
                    };
                    return (
                        <li
                            key={s.lot.id}
                            className={`hub-slot is-filled${female ? ' is-female' : ''}${newest ? ' is-latest' : ''}${opt}${open ? ' is-tappable' : ''}`}
                            {...open}
                        >
                            <span className="hub-slot-cat">{catLetter(g?.name ?? '')}</span>
                            <span className="hub-slot-name">{s.lot.name}</span>
                            {s.lot.retained ? <span className="hub-slot-tag is-retained">RET</span> : newest ? <span className="hub-slot-tag is-new">NEW</span> : null}
                            <span className="hub-slot-price">{rupees(s.lot.priceInr ?? 0)}</span>
                        </li>
                    );
                })}
            </ul>
            <div className="hub-board-spent">
                <span className="hub-board-meta">{count}</span>
                <span className="hub-board-spending">
                    <span>Total spent</span>
                    <strong>{rupees(spentBy(team.id, a.lots))}</strong>
                </span>
            </div>
        </article>
    );
}

export function SquadLegend() {
    return (
        <div className="hub-squad-legend" aria-label="Squad slot key">
            <span>
                <b>A–D</b>Category
            </span>
            <span>
                <i className="ls-female" />
                Female
            </span>
            <span>
                <i className="ls-need">Female needed</i>Slot reserved for a female player
            </span>
            <span>
                <i className="ls-retained">RET</i>Retained before the auction
            </span>
            <span>
                <i className="ls-new">NEW</i>Latest buy
            </span>
        </div>
    );
}

/** Teams as eight fixed squad columns; no charts, no scrolling inside a column. */
export function HubSquadBoard({ a, onPlayer }: { a: HubData; onPlayer?: (lotId: string) => void }) {
    const [open, setOpen] = useState<string | null>(null);
    const teams = a.teams.slice().sort((x, y) => x.sort - y.sort);
    const latest = [...a.lots]
        .filter((l) => l.status === 'SOLD' && !l.retained && l.soldAt)
        .sort((x, y) => (y.soldAt ?? '').localeCompare(x.soldAt ?? ''))[0];
    const team = teams.find((t) => t.id === open);
    return (
        <div className="hub-squad-wrap">
            <div className="hub-squad-board">
                {teams.map((t) => (
                    <SquadColumn key={t.id} team={t} a={a} latestId={latest?.id ?? null} onOpen={() => setOpen(t.id)} onPlayer={onPlayer} />
                ))}
            </div>
            <SquadLegend />
            <Dialog open={!!team} onOpenChange={(o) => !o && setOpen(null)}>
                <SheetContent className="hub-sheet">{team && <TeamDetail team={team} a={a} />}</SheetContent>
            </Dialog>
        </div>
    );
}

function TeamDetail({ team, a }: { team: HubTeam; a: HubData }) {
    const b = bidBudget(team, a);
    const s = teamStats(team, a.lots);
    const squad = a.lots
        .filter((l) => l.status === 'SOLD' && l.teamId === team.id)
        .sort((x, y) => Number(!!y.retained) - Number(!!x.retained) || (x.soldAt ?? '').localeCompare(y.soldAt ?? ''));
    const more = Math.max(0, MIN_SQUAD - b.squad);
    return (
        <div className="hub-detail">
            <DialogHeader className="hub-detail-head">
                <TeamLogo name={team.name} logoUrl={team.logoUrl} size={44} />
                <div>
                    <DialogTitle>{team.name}</DialogTitle>
                    <DialogDescription>
                        {b.squad}/{MIN_SQUAD} players · {b.femaleOwned}/{FEMALE_MIN} female
                    </DialogDescription>
                </div>
            </DialogHeader>
            <div>
                <span className="hub-label">{a.currentId ? 'Can bid up to' : 'Max bid'}</span>
                <strong className="hub-big">{b.outReason ?? (b.maxBid === null ? '—' : rupees(b.maxBid))}</strong>
                <p className="hub-muted">
                    Keeps {rupees(b.reserve)} for {b.spotsAfterBid} more player{b.spotsAfterBid === 1 ? '' : 's'}
                </p>
            </div>
            <PurseBar team={team} spent={spentBy(team.id, a.lots)} b={b} />
            <dl className="hub-mini">
                <div>
                    <dt>Avg buy</dt>
                    <dd>{s.avgBuy === null ? '—' : rupees(s.avgBuy)}</dd>
                </div>
                <div>
                    <dt>Top buy</dt>
                    <dd>{s.topBuy === null ? '—' : rupees(s.topBuy)}</dd>
                </div>
                <div>
                    <dt>Per slot left</dt>
                    <dd>{s.perSlot === null ? '—' : rupees(s.perSlot)}</dd>
                </div>
            </dl>
            <ul className="hub-list" aria-label={`${team.name} squad`}>
                {squad.map((l) => (
                    <li key={l.id}>
                        <span className="hub-list-name">
                            {isFemale(l) && <i className="d-female" aria-label="Female" />}
                            {l.name}
                            {l.retained && <span className="pp-status pp-status-info">Retained</span>}
                        </span>
                        <span className="hub-muted">{a.groups.find((g) => g.id === l.categoryId)?.name}</span>
                        <strong>{rupees(l.priceInr ?? 0)}</strong>
                    </li>
                ))}
                {!squad.length && <li className="hub-muted">No players yet</li>}
            </ul>
            <p className="hub-missing">
                {more || b.femaleNeeded
                    ? [more && `${more} more to reach ${MIN_SQUAD}`, b.femaleNeeded && `${b.femaleNeeded} female needed`].filter(Boolean).join(' · ')
                    : 'Squad complete'}
            </p>
        </div>
    );
}

/** Compact fact sheet: six numbers on the left, one row per category on the right. */
export function HubStats({ a }: { a: HubData }) {
    const f = auctionFacts(a.groups, a.lots, a.teams, a.currentGroupId, a.phase);
    const short = (left: number, need: number) => left < need && <small className="hub-short">{need - left} short</small>;
    const money = (n: number | null) => (n === null ? '—' : rupees(n));
    return (
        <section className="hub-facts" aria-label="Auction statistics">
            <dl className="hub-facts-nums">
                <div>
                    <dt>Sold</dt>
                    <dd>
                        {f.sold}
                        <small> / {f.lots}</small>
                    </dd>
                </div>
                <div>
                    <dt>Unsold</dt>
                    <dd>{f.unsold}</dd>
                </div>
                <div>
                    <dt>Spent</dt>
                    <dd>{rupees(f.spent)}</dd>
                </div>
                <div>
                    <dt>Avg price</dt>
                    <dd>{money(f.average)}</dd>
                </div>
                <div>
                    <dt>Players left / needed</dt>
                    <dd>
                        {f.playersLeft}
                        <small> / {f.needed}</small>
                        {short(f.playersLeft, f.needed)}
                    </dd>
                </div>
                <div>
                    <dt>Female left / needed</dt>
                    <dd>
                        {f.femaleLeft}
                        <small> / {f.femaleNeeded}</small>
                        {short(f.femaleLeft, f.femaleNeeded)}
                    </dd>
                </div>
            </dl>
            <table className="hub-facts-table">
                <thead>
                    <tr>
                        <th>Category</th>
                        <th className="hf-wide">Base</th>
                        <th>Sold</th>
                        <th>Avg price</th>
                        <th className="hf-wide">Females/Avg price</th>
                        <th className="hf-wide">Top buy</th>
                    </tr>
                </thead>
                <tbody>
                    {f.categories.map((c) => {
                        const female = money(c.femaleAvg);
                        const top = c.top ? (
                            <>
                                {c.top.name} <b>{rupees(c.top.price)}</b>
                            </>
                        ) : (
                            '—'
                        );
                        return (
                            <tr key={c.group.id} className={c.started ? '' : 'is-muted'}>
                                <td>
                                    <span className="hf-cat">
                                        {c.group.name}
                                        {c.live && (
                                            <span className="hf-live">
                                                <i />
                                                LIVE
                                            </span>
                                        )}
                                    </span>
                                    <span className="hf-sub">
                                        Females {c.femaleTotal} · Avg {female} · Top {top}
                                    </span>
                                </td>
                                <td className="hf-wide">{rupees(c.group.basePriceInr)}</td>
                                <td>
                                    {c.sold}
                                    <small> / {c.total}</small>
                                </td>
                                <td>
                                    {c.avg === null ? (
                                        '—'
                                    ) : (
                                        <>
                                            {rupees(c.avg)} <small>{formatTimes(c.times ?? 1)}</small>
                                        </>
                                    )}
                                </td>
                                <td className="hf-wide">
                                    {c.femaleTotal}
                                    <small> / </small>
                                    {female}
                                </td>
                                <td className="hf-wide hf-top">{top}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </section>
    );
}
