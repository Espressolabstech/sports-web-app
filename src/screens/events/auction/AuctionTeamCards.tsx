import { MIN_SQUAD, rupees, squadOf, byNumber } from '../../../lib/auction';
import { TeamLogo } from './AuctionShell';

/** Team Hub: split cards — purse and progress on the left, the full squad on the right. */
export function AuctionTeamCards({ teams, lots }: { teams: ApiAuctionTeam[]; lots: ApiAuctionLot[] }) {
    return (
        <div className="auction-team-grid">
            {teams.map((t) => {
                const spent = lots.filter((l) => l.status === 'SOLD' && l.teamId === t.id).reduce((n, l) => n + (l.priceInr ?? 0), 0);
                const squad = lots
                    .filter((l) => l.status === 'SOLD' && l.teamId === t.id)
                    .sort((x, y) => Number(!!y.retained) - Number(!!x.retained) || byNumber(x, y));
                const st = squadOf(t.id, lots);
                const percent = t.purseInr ? Math.min(100, (spent / t.purseInr) * 100) : 0;
                const slots = Math.max(12, Math.ceil(squad.length / 2) * 2);
                const open = slots - squad.length;
                const avg = squad.length ? Math.round(spent / squad.length) : 0;
                return (
                    <article key={t.id} className="auction-team-card pp-team-balanced pp-team-split pp-hub-card">
                        <div className="pp-team-summary">
                            <header className="pp-hub-id">
                                <TeamLogo name={t.name} logoUrl={t.logoUrl} size={36} />
                                <h3>{t.name}</h3>
                            </header>
                            <div className="pp-hub-money">
                                <strong className="pp-hub-left">{rupees(t.purseInr - spent)}</strong>
                                <span className="pp-hub-of">left of {rupees(t.purseInr)}</span>
                                <div
                                    className="auction-bar"
                                    role="meter"
                                    aria-label={`${t.name} purse spent`}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={Math.round(percent)}
                                >
                                    <span style={{ width: `${percent}%` }} />
                                </div>
                                <span className="pp-hub-used">
                                    {rupees(spent)} used ({Math.round(percent)}%)
                                </span>
                            </div>
                        </div>
                        <div className="pp-team-players">
                            <div className="pp-hub-squad">
                                <div className="pp-hub-dots" aria-hidden="true">
                                    {Array.from({ length: Math.max(MIN_SQUAD, st.players) }, (_, i) => (
                                        <i key={i} className={i < st.women ? 'woman' : i < st.players ? 'filled' : ''} />
                                    ))}
                                </div>
                                <span>
                                    {st.players} player{st.players === 1 ? '' : 's'} · {st.women} female
                                </span>
                            </div>
                            <ul aria-label={`${t.name} squad`} className="pp-hub-roster" style={{ ['--hub-rows' as string]: slots / 2 }}>
                                {squad.map((l) => (
                                    <li key={l.id}>
                                        <span className="pp-hub-name">
                                            <span>{l.name}</span>
                                            {l.retained && (
                                                <b className="pp-hub-r" title="Retained" aria-label="Retained">
                                                    R
                                                </b>
                                            )}
                                        </span>
                                        <strong>{rupees(l.priceInr ?? 0)}</strong>
                                    </li>
                                ))}
                                {Array.from({ length: open }, (_, k) => (
                                    <li key={`s${k}`} className="pp-hub-slot">
                                        <span>Open</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="pp-hub-avg">
                                <span>Avg. spend</span>
                                <strong>{squad.length ? rupees(avg) : '—'}</strong>
                            </div>
                        </div>
                    </article>
                );
            })}
        </div>
    );
}
