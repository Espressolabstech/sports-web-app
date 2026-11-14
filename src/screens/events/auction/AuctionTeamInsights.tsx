import { useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/pp-ui';
import { categoryAverages, rupees, spendingTrend, spentBy } from '../../../lib/auction';

export function AuctionTeamInsights({ teams, categories, lots }: { teams: ApiAuctionTeam[]; categories: ApiAuctionCategory[]; lots: ApiAuctionLot[] }) {
    const [teamId, setTeamId] = useState('');
    const team = teams.find((t) => t.id === teamId) ?? teams[0];
    const trend = team ? spendingTrend(lots, team.id) : [];
    return (
        <section className="pp-insights-section">
            <header className="pp-insights-heading">
                <div>
                    <span className="pp-player-id">AUCTION STATISTICS</span>
                    <h2>Team insights</h2>
                </div>
                <Select value={team?.id ?? ''} onValueChange={setTeamId}>
                    <SelectTrigger aria-label="Insights team">
                        <SelectValue placeholder="Choose team" />
                    </SelectTrigger>
                    <SelectContent className="pp-console pp-menu">
                        {teams.map((t) => (
                            <SelectItem value={t.id} key={t.id}>
                                {t.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </header>
            {!team ? (
                <p className="text-muted-foreground py-6">Loading team insights…</p>
            ) : (
                <>
                    <div className="pp-insight-summary">
                        <span>{team.name}</span>
                        <strong>
                            {rupees(spentBy(team.id, lots))}
                            <small>Total committed</small>
                        </strong>
                        <span>
                            {rupees(
                                lots.filter((l) => l.teamId === team.id && l.status === 'SOLD' && l.retained).reduce((n, l) => n + (l.priceInr ?? 0), 0),
                            )}{' '}
                            in retentions
                        </span>
                    </div>
                    <div className="pp-insight-layout">
                        <div>
                            <h3>Average sale price</h3>
                            <table className="pp-average-table">
                                <thead>
                                    <tr>
                                        <th>Category</th>
                                        <th>Team</th>
                                        <th>Auction</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categoryAverages(categories, lots, team.id).map((g) => (
                                        <tr key={g.name}>
                                            <td>{g.name}</td>
                                            <td>
                                                {g.own === null ? '—' : rupees(g.own)}
                                                <small>{g.count} bought</small>
                                            </td>
                                            <td>{g.market === null ? '—' : rupees(g.market)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <p className="text-xs text-muted-foreground mt-3">Completed sales only · Retentions excluded</p>
                        </div>
                        <div className="pp-trend">
                            <h3>Cumulative spending</h3>
                            {trend.length > 1 ? (
                                <div className="pp-trend-chart">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={trend} margin={{ left: 0, right: 16, top: 24, bottom: 12 }}>
                                            <XAxis dataKey="sale" stroke="var(--ink-muted)" tickLine={false} axisLine={false} />
                                            <YAxis
                                                stroke="var(--ink-muted)"
                                                tickLine={false}
                                                axisLine={false}
                                                width={56}
                                                tickFormatter={(v) => `₹${Number(v) / 1000}k`}
                                            />
                                            <Tooltip
                                                content={({ active, payload }) =>
                                                    active && payload?.length ? (
                                                        <div className="pp-chart-tooltip">
                                                            {payload[0]?.payload.label}
                                                            <br />
                                                            <strong>{rupees(Number(payload[0]?.value))}</strong>
                                                        </div>
                                                    ) : null
                                                }
                                            />
                                            <Line
                                                dataKey="total"
                                                type="stepAfter"
                                                stroke="var(--info)"
                                                strokeWidth={2}
                                                dot={{ r: 3, fill: 'var(--info)' }}
                                                isAnimationActive={false}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="pp-trend-empty">No auction sales yet</div>
                            )}
                            <p className="text-xs text-muted-foreground">Sale sequence · Starting balance includes retentions</p>
                        </div>
                    </div>
                </>
            )}
        </section>
    );
}
