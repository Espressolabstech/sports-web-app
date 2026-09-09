import { Crown } from 'lucide-react';
import type { StandingsRow } from '../../lib/public-events';

const card = { backgroundColor: 'hsl(var(--event-ink-soft))' };
const onInk = { color: 'hsl(var(--event-on-ink))' };

function initials(name: string) {
    return name
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

export function Podium({ rows }: { rows: StandingsRow[] }) {
    const order = [rows[1], rows[0], rows[2]].filter(Boolean);
    const places = [2, 1, 3];
    const heights = ['h-20', 'h-28', 'h-16'];
    const barTone = [
        'hsl(var(--event-on-ink)/0.12)',
        'hsl(var(--event-accent)/0.28)',
        'hsl(var(--event-on-ink)/0.08)',
    ];

    return (
        <div className="overflow-hidden rounded-2xl p-5" style={card}>
            <div className="flex items-end justify-center gap-3">
                {order.map((row, i) => {
                    const place = places[i];
                    const isFirst = place === 1;
                    return (
                        <div key={row.playerId} className="flex w-1/3 flex-col items-center gap-2">
                            <span
                                className="flex h-12 w-12 items-center justify-center rounded-full text-[13px] font-bold"
                                style={
                                    isFirst
                                        ? {
                                              backgroundColor: 'hsl(var(--event-accent))',
                                              color: 'hsl(var(--event-accent-foreground))',
                                          }
                                        : { backgroundColor: 'hsl(var(--event-on-ink)/0.12)', ...onInk }
                                }
                            >
                                {initials(row.name)}
                            </span>
                            <div className="text-center">
                                <p className="truncate text-[13px] font-semibold" style={onInk}>
                                    {row.name}
                                </p>
                                <p
                                    className="text-[12px] font-bold tabular-nums"
                                    style={{ color: 'hsl(var(--event-accent))' }}
                                >
                                    {row.points} pts
                                </p>
                            </div>
                            <div
                                className={`flex w-full flex-col items-center justify-start rounded-t-xl pt-3 ${heights[i]}`}
                                style={{ backgroundColor: barTone[i] }}
                            >
                                {isFirst && (
                                    <Crown
                                        className="h-4 w-4"
                                        style={{ color: 'hsl(var(--event-accent-foreground))' }}
                                    />
                                )}
                                <p
                                    className="mt-1 text-[18px] font-black tabular-nums"
                                    style={{
                                        color: isFirst
                                            ? 'hsl(var(--event-accent-foreground))'
                                            : 'hsl(var(--event-on-ink))',
                                    }}
                                >
                                    {place}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
