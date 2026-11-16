import { useState } from 'react';
import { Dialog, DialogDescription, DialogHeader, DialogTitle, SheetContent } from '../../../components/pp-ui';
import { MIN_SQUAD, rupees, spentBy, waitingQueue } from '../../../lib/auction';
import { bidBudget, FEMALE_MIN, isFemale, squadDots, type BudgetTeam } from '../../../lib/auction-bid-budget';
import { auctionPool, auctionStats, formatTimes, teamStats } from '../../../lib/auction-hub-stats';
import { TeamLogo } from './AuctionShell';

import type { HubData, HubTeam } from './hub-data';
type Budget = ReturnType<typeof bidBudget>;

const genderLabel = (l: { gender: string | null } | undefined) => (isFemale(l) ? 'Female' : 'Male');

export function HubTop({ a }: { a: HubData }) {
    const live = a.lots.find((l) => l.id === a.currentId);
    const g = a.groups.find((x) => x.id === live?.categoryId);
    const nextG =
        a.groups.find((x) => x.id === a.currentGroupId) ??
        a.groups
            .slice()
            .sort((x, y) => x.sort - y.sort)
            .find((x) => waitingQueue(a.lots, x.id).length);
    const pool = auctionPool(a.teams, a.lots);
    const short = pool.femaleNeeded - pool.femaleLeft;
    const queued = nextG ? waitingQueue(a.lots, nextG.id).length : 0;
    return (
        <div className="hub-top">
            <section className="hub-card hub-block" aria-label="On the block">
                <span className="hub-label">On the block</span>
                {live ? (
                    <>
                        <strong className="hub-block-name">{live.name}</strong>
                        <div className="hub-chips">
                            <span className={`hub-chip ${isFemale(live) ? 'is-female' : ''}`}>{genderLabel(live)}</span>
                            <span className="hub-chip">{g?.name ?? 'Unassigned'}</span>
                            <span className="hub-chip">Base {rupees(live.effectiveBasePriceInr)}</span>
                        </div>
                    </>
                ) : (
                    <strong className="hub-block-next">
                        {nextG ? `Up next: ${nextG.name} · ${queued} player${queued === 1 ? '' : 's'}` : a.phase === 'REAUCTION' ? 'Final round' : 'Waiting for the next draw'}
                    </strong>
                )}
            </section>
            <section className="hub-card hub-pool" aria-label="Auction pool">
                <span className="hub-label">Auction pool</span>
                <dl>
                    <div>
                        <dt>Players left</dt>
                        <dd>{pool.playersLeft}</dd>
                    </div>
                    <div>
                        <dt>Slots to fill</dt>
                        <dd>{pool.slotsToFill}</dd>
                    </div>
                    <div>
                        <dt>Female left</dt>
                        <dd>{pool.femaleLeft}</dd>
                    </div>
                    <div>
                        <dt>Female needed</dt>
                        <dd>
                            {pool.femaleNeeded}
                            {short > 0 && <small className="text-warning"> {short} short</small>}
                        </dd>
                    </div>
                </dl>
            </section>
        </div>
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

function Tile({ team, a, onOpen }: { team: HubTeam; a: HubData; onOpen: () => void }) {
    const b = bidBudget(team, a);
    const live = !!a.currentId;
    const out = live && (b.outReason || b.maxBid === null);
    return (
        <button type="button" className={`hub-card hub-tile${out ? ' is-out' : ''}`} onClick={onOpen} aria-label={`${team.name} details`}>
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
        </button>
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
    const teams = a.teams.slice().sort((x, y) => x.sort - y.sort);
    const team = teams.find((t) => t.id === open);
    return (
        <>
            <div className="hub-tiles">
                {teams.map((t) => (
                    <Tile key={t.id} team={t} a={a} onOpen={() => setOpen(t.id)} />
                ))}
            </div>
            <HubLegend />
            <Dialog open={!!team} onOpenChange={(o) => !o && setOpen(null)}>
                <SheetContent className="hub-sheet">{team && <TeamDetail team={team} a={a} />}</SheetContent>
            </Dialog>
        </>
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

export function HubStats({ a }: { a: HubData }) {
    const s = auctionStats(a.groups, a.lots, a.teams);
    const prices = s.categories.flatMap((c) => c.sales.map((l) => l.priceInr ?? 0)).concat(s.categories.map((c) => c.group.basePriceInr));
    const min = Math.min(...prices) === Infinity ? 0 : Math.min(...prices) * 0.9;
    const max = Math.max(...prices, 1) * 1.05;
    const x = (v: number) => `${((v - min) / (max - min || 1)) * 100}%`;
    const cur = a.groups.find((g) => g.id === a.currentGroupId);
    return (
        <section className="hub-stats" aria-label="Auction statistics">
            <div className="hub-headline">
                <div className="hub-card">
                    <span className="hub-label">Players sold</span>
                    <strong>{s.sold}</strong>
                </div>
                <div className="hub-card">
                    <span className="hub-label">Spent at auction</span>
                    <strong>{rupees(s.spent)}</strong>
                </div>
                <div className="hub-card">
                    <span className="hub-label">Average price</span>
                    <strong>{s.sold ? rupees(s.average) : '—'}</strong>
                </div>
                <div className="hub-card">
                    <span className="hub-label">Unsold</span>
                    <strong>{s.unsold}</strong>
                    <small className="hub-muted">back in final round</small>
                </div>
            </div>
            <div className="hub-stats-grid">
                <div className="hub-card hub-price">
                    <h3>Price by category</h3>
                    {s.categories.map((c) => {
                        const stacks = new Map<number, number>();
                        return (
                            <div key={c.group.id} className="hub-price-row">
                                <div className="hub-price-label">
                                    <strong>{c.group.name}</strong>
                                    <span className="hub-muted">{rupees(c.group.basePriceInr)}</span>
                                </div>
                                {c.sales.length ? (
                                    <div className="hub-axis">
                                        <i className="hub-base-line" style={{ left: x(c.group.basePriceInr) }} />
                                        {c.avg !== null && (
                                            <i className="hub-avg-line" style={{ left: x(c.avg) }}>
                                                <span>avg {rupees(c.avg)}</span>
                                            </i>
                                        )}
                                        {c.sales.map((l) => {
                                            const v = l.priceInr ?? 0;
                                            const n = stacks.get(v) ?? 0;
                                            stacks.set(v, n + 1);
                                            return <i key={l.id} className={`hub-dot ${isFemale(l) ? 'd-female' : 'd-male'}`} style={{ left: x(v), bottom: 6 + n * 9 }} title={`${l.name} · ${rupees(v)}`} />;
                                        })}
                                    </div>
                                ) : (
                                    <div className="hub-axis hub-axis-empty">
                                        {c.group.id === cur?.id || (!cur && c.waiting) ? `Up next · ${c.waiting} player${c.waiting === 1 ? '' : 's'}` : 'Not started'}
                                    </div>
                                )}
                                <div className="hub-price-meta">
                                    {c.times !== null ? (
                                        <>
                                            <strong>{c.times.toFixed(2)}× over base</strong>
                                            <span className="hub-muted">
                                                {c.sales.length} sold · {c.unsold} unsold
                                            </span>
                                        </>
                                    ) : (
                                        <span className="hub-muted">—</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="hub-side">
                    {s.female.count > 0 && s.male.count > 0 && (
                        <div className="hub-card hub-gender">
                            <h3>Female vs male</h3>
                            {(
                                [
                                    ['Female', s.female, 'd-female'],
                                    ['Male', s.male, 'd-male'],
                                ] as const
                            ).map(([label, g, cls]) => (
                                <div key={label} className="hub-gender-row">
                                    <div className="hub-gender-top">
                                        <span>{label}</span>
                                        <span className="hub-muted">
                                            {g.count} sold · {g.times.toFixed(2)}× base
                                        </span>
                                    </div>
                                    <div className="hub-gbar">
                                        <span className={cls} style={{ width: `${(g.avg / Math.max(s.female.avg, s.male.avg)) * 100}%` }} />
                                    </div>
                                    <strong>{rupees(g.avg)} avg</strong>
                                </div>
                            ))}
                            <p className="hub-muted">Compare × base, not raw price — the category mix differs.</p>
                        </div>
                    )}
                    {s.highlights && (
                        <div className="hub-card hub-highlights">
                            <h3>Highlights</h3>
                            {(
                                [
                                    ['Top buy', s.highlights.top],
                                    ['Top female buy', s.highlights.topFemale],
                                    ['Steal', s.highlights.steal],
                                ] as const
                            ).map(
                                ([label, h]) =>
                                    h && (
                                        <div key={label} className="hub-hl">
                                            <span className="hub-label">{label}</span>
                                            <div className="hub-hl-main">
                                                <i className={isFemale(h.lot) ? 'd-female' : 'd-male'} />
                                                <strong>{h.lot.name}</strong>
                                                <span>{rupees(h.lot.priceInr ?? 0)}</span>
                                            </div>
                                            <span className="hub-muted">
                                                {h.team?.name} · {h.group?.name} · {formatTimes(h.times)}
                                            </span>
                                        </div>
                                    ),
                            )}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
