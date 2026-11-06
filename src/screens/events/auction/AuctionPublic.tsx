import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAuctionPublicView } from '../../../api/adapters/auction';
import { useEventLive } from '../../../lib/auction-live';
import { justSold, squadSlots } from '../../../lib/auction-public';
import { AnimatedLoader } from '../../../components/AnimatedLoader';
import AuctionShell from './AuctionShell';

const rupees = (p: number) => '₹' + Math.round(p).toLocaleString('en-IN');
const num = (n: number | null) => String(n ?? 0).padStart(3, '0');
const ago = (iso: string, now: number) => {
    const m = Math.max(0, Math.floor((now - Date.parse(iso)) / 60000));
    return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : `${Math.floor(m / 60)} h ago`;
};
const SQUAD = 11;

function Logo({ t }: { t: ApiAuctionPublicTeam }) {
    return t.logo ? (
        <img src={t.logo} alt="" width={32} height={32} className="pv-logo" loading="lazy" />
    ) : (
        <span className="pv-logo" aria-hidden="true">
            {t.name
                .split(' ')
                .map((w) => w[0])
                .join('')
                .slice(0, 2)}
        </span>
    );
}

/** The light public view: numbers, names, categories and money only. */
export default function AuctionPublic({ slugOverride }: { slugOverride?: string }) {
    const params = useParams();
    const slug = slugOverride ?? params.slug!;
    const queryClient = useQueryClient();
    const { data, isLoading, error } = useQuery({
        queryKey: ['auction-public', slug],
        queryFn: () => getAuctionPublicView(slug),
        retry: false,
    });
    useEventLive(slug, () => queryClient.invalidateQueries({ queryKey: ['auction-public', slug] }));
    const snap = data?.data;

    const [tab, setTab] = useState<'teams' | 'sold' | 'waiting'>('teams');
    const [open, setOpen] = useState<string | null>(null);
    const [q, setQ] = useState('');
    const [now, setNow] = useState(() => Date.now());
    const [flash, setFlash] = useState<string | null>(null);
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(t);
    }, []);

    const teamName = useMemo(() => new Map((snap?.teams ?? []).map((t) => [t.id, t.name])), [snap?.teams]);
    const last = snap ? justSold(snap) : undefined;
    const block = snap?.onBlock ? snap.lots.find((l) => l.id === snap.onBlock) : undefined;
    // Highlight only a genuinely new sale (new player or new sale time) seen after load — corrections never replay it.
    const saleKey = last ? `${last.id}${last.soldAt}` : '';
    const [seenKey, setSeenKey] = useState<string | null>(null);
    if (snap && saleKey !== seenKey) {
        setSeenKey(saleKey);
        if (seenKey !== null && saleKey && last) setFlash(last.team);
    }
    useEffect(() => {
        if (!flash) return;
        const t = setTimeout(() => setFlash(null), 2600);
        return () => clearTimeout(t);
    }, [flash]);

    const shell = (children: React.ReactNode) => (
        <AuctionShell slug={slug} isLive={!!block} kicker="THE COURT COLLECTIVE 2026 · PLAYER AUCTION" title="Public View" className="pv-page pp-console">
            {children}
        </AuctionShell>
    );

    if (error) return shell(<p role="alert" className="pv-msg">{(error as { message?: string }).message || 'Could not load the auction. Please refresh.'}</p>);
    if (isLoading || !snap) {
        return shell(
            <div className="flex justify-center py-16">
                <AnimatedLoader />
            </div>,
        );
    }

    const sold = snap.lots
        .filter((l) => l.status === 'SOLD')
        .sort((a, b) => Number(a.retained) - Number(b.retained) || (b.soldAt ?? '').localeCompare(a.soldAt ?? ''));
    const term = q.trim().toLowerCase();
    const match = (l: { number: number | null; name: string }) => !term || `${num(l.number)} ${l.number ?? ''} ${l.name}`.toLowerCase().includes(term);
    const waiting = snap.lots.filter((l) => l.status === 'WAITING' && match(l));
    const cats = [...new Set(snap.lots.map((l) => l.category).filter((c): c is string => !!c))].sort();
    const groups = [
        ...cats.map((c) => ({ name: c, items: waiting.filter((l) => l.category === c) })),
        { name: 'Unsold — back in the final round', items: snap.lots.filter((l) => l.status === 'UNSOLD' && match(l)) },
    ].filter((g) => g.items.length);
    const team = snap.teams.find((t) => t.id === open);

    return shell(
        <>
            <section className={`pv-top${flash && !block ? ' pv-flash' : ''}`} aria-live="polite">
                {block ? (
                    <>
                        <span className="pv-eyebrow">
                            <span className="pp-status pp-status-success">On the block</span>
                        </span>
                        <div className="pv-top-main">
                            <span className="pv-num">{num(block.number)}</span>
                            <strong className="pv-trunc">{block.name}</strong>
                        </div>
                        <span className="pp-status pp-status-neutral pv-pill">{block.category ?? 'Unassigned'}</span>
                    </>
                ) : last ? (
                    <>
                        <span className="pv-eyebrow">
                            <span className="pp-status pp-status-success">Sold</span>
                            {last.soldAt ? ago(last.soldAt, now) : ''}
                        </span>
                        <div className="pv-top-main">
                            <strong className="pv-trunc">{last.name}</strong>
                            <span className="pv-price">{rupees(last.price ?? 0)}</span>
                        </div>
                        <span className="pv-sub pv-trunc">
                            {teamName.get(last.team ?? '') ?? ''} · {last.category ?? 'Unassigned'}
                        </span>
                    </>
                ) : (
                    <>
                        <span className="pv-eyebrow">Auction</span>
                        <div className="pv-top-main">
                            <strong>Waiting for the first player</strong>
                        </div>
                        <span className="pv-sub">Players are drawn from a bowl</span>
                    </>
                )}
            </section>

            <div className="pv-tabs" role="tablist">
                {(['teams', 'sold', 'waiting'] as const).map((k) => (
                    <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
                        {k === 'teams' ? 'Teams' : k === 'sold' ? `Sold ${sold.length}` : `Waiting ${snap.lots.filter((l) => l.status === 'WAITING' || l.status === 'UNSOLD').length}`}
                    </button>
                ))}
            </div>

            {tab === 'teams' && (
                <ul className="pv-teams">
                    {snap.teams.map((t) => {
                        const squad = squadSlots(snap, t.id);
                        const dots = Math.max(SQUAD, squad.length);
                        return (
                            <li key={t.id}>
                                <button
                                    className={`pv-team${flash === t.id ? ' pv-flash' : ''}`}
                                    onClick={() => setOpen(t.id)}
                                    aria-label={`${t.name}: ${t.players} of ${SQUAD} players, ${rupees(t.purse - t.spent)} left`}
                                >
                                    <Logo t={t} />
                                    <span className="pv-team-mid">
                                        <span className="pv-trunc pv-team-name">{t.name}</span>
                                        <span className="pv-dots" aria-hidden="true">
                                            {Array.from({ length: dots }, (_, i) => (
                                                <i key={i} className={squad[i] ? (squad[i].woman ? 'w' : 'f') : ''} />
                                            ))}
                                            <em>
                                                {t.players}/{SQUAD}
                                            </em>
                                        </span>
                                    </span>
                                    <span className="pv-purse">
                                        {rupees(t.purse - t.spent)}
                                        <small>left</small>
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}

            {tab === 'sold' && (
                <ul className="pv-list">
                    {sold.map((l) => (
                        <li key={l.id}>
                            <span className="pv-num">{num(l.number)}</span>
                            <span className="pv-list-mid">
                                <strong className="pv-trunc">{l.name}</strong>
                                <small className="pv-trunc">
                                    {teamName.get(l.team ?? '')} · {l.category ?? 'Unassigned'}
                                </small>
                            </span>
                            {l.retained ? <span className="pp-status pp-status-info">Retained</span> : <span className="pv-price">{rupees(l.price ?? 0)}</span>}
                        </li>
                    ))}
                    {!sold.length && <li className="pv-empty">No players sold yet</li>}
                </ul>
            )}

            {tab === 'waiting' && (
                <>
                    <input
                        className="pv-search"
                        type="search"
                        placeholder="Search name or number"
                        aria-label="Search waiting players"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                    />
                    {groups.map((g) => (
                        <section key={g.name} className="pv-group">
                            <h2>
                                {g.name} <span>{g.items.length}</span>
                            </h2>
                            <ul className="pv-list">
                                {g.items.map((l) => (
                                    <li key={l.id}>
                                        <span className="pv-num">{num(l.number)}</span>
                                        <strong className="pv-trunc">{l.name}</strong>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}
                    {!groups.length && <p className="pv-empty">No players found</p>}
                </>
            )}

            {team && (
                <div className="pv-sheet-backdrop" onClick={() => setOpen(null)}>
                    <aside className="pv-sheet" role="dialog" aria-modal="true" aria-label={`${team.name} squad`} onClick={(e) => e.stopPropagation()}>
                        <header>
                            <Logo t={team} />
                            <strong className="pv-trunc">{team.name}</strong>
                            <button className="pv-close" onClick={() => setOpen(null)} aria-label="Close">
                                ×
                            </button>
                        </header>
                        <div className="pv-sheet-stats">
                            <div>
                                <small>Purse left</small>
                                <strong>{rupees(team.purse - team.spent)}</strong>
                            </div>
                            <div>
                                <small>Spent</small>
                                <strong>{rupees(team.spent)}</strong>
                            </div>
                            <div>
                                <small>Squad</small>
                                <strong>
                                    {team.players}/{SQUAD}
                                </strong>
                            </div>
                        </div>
                        <ol className="pv-slots">
                            {(() => {
                                const s = squadSlots(snap, team.id);
                                return Array.from({ length: Math.max(SQUAD, s.length) }, (_, i) => {
                                    const l = s[i];
                                    return (
                                        <li key={i} className={l ? '' : 'open'}>
                                            <span className="pv-slot-n">{i + 1}</span>
                                            {l ? (
                                                <>
                                                    <span className="pv-trunc">
                                                        {l.name}
                                                        {l.woman ? ' · W' : ''}
                                                    </span>
                                                    {l.retained ? <span className="pp-status pp-status-info">Retained</span> : <span className="pv-price">{rupees(l.price ?? 0)}</span>}
                                                </>
                                            ) : (
                                                <span>Open</span>
                                            )}
                                        </li>
                                    );
                                });
                            })()}
                        </ol>
                    </aside>
                </div>
            )}
        </>,
    );
}
