import { useState } from 'react';
import { cn } from '../../../utils/twMerge';
import { onInk, onInkMuted, ink } from './organizer-ui';

export interface StandingRow {
    playerId: string;
    name: string;
    points: number;
    matchPoints: number;
    bonusPoints: number;
    byePoints: number;
    played: number;
    won: number;
    byes: number;
    topUpPoints?: number;
    rank: number;
}

const RANK_COLOR: Record<number, string> = { 1: '#C99C22', 2: '#8E8E93', 3: '#B0763B' };

export function Leaderboard({ rows, showByes = true, topUps = false }: { rows: StandingRow[]; showByes?: boolean; topUps?: boolean }) {
    const [selected, setSelected] = useState<StandingRow | null>(null);
    const lastCol = showByes || topUps;
    const cols = lastCol ? '24px_minmax(0,1fr)_44px_30px_30px_44px' : '24px_minmax(0,1fr)_44px_30px_30px';

    return (
        <>
            <div className="overflow-hidden rounded-2xl" style={{ backgroundColor: 'hsl(var(--event-ink-soft))' }}>
                <div className={cn('grid gap-2 px-3 pb-2 pt-3')} style={{ gridTemplateColumns: cols.split('_').join(' ') }}>
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={onInkMuted}>#</span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em]" style={onInkMuted}>Player</span>
                    <span className="text-right text-[10px] font-bold uppercase tracking-[0.1em]" style={onInkMuted}>Pts</span>
                    <span className="text-right text-[10px] font-bold uppercase tracking-[0.1em]" style={onInkMuted}>P</span>
                    <span className="text-right text-[10px] font-bold uppercase tracking-[0.1em]" style={onInkMuted}>W</span>
                    {showByes && <span className="text-right text-[10px] font-bold uppercase tracking-[0.1em]" style={onInkMuted}>Byes</span>}
                    {topUps && <span className="text-right text-[10px] font-bold uppercase tracking-[0.1em]" style={onInkMuted}>Top-up</span>}
                </div>
                {rows.map((r, i) => (
                    <button
                        key={r.playerId}
                        type="button"
                        onClick={() => setSelected(r)}
                        className={cn('grid w-full gap-2 px-3 py-2.5 text-left', i > 0 && 'border-t')}
                        style={{ gridTemplateColumns: cols.split('_').join(' '), borderColor: 'hsl(var(--event-on-ink)/0.08)' }}
                    >
                        <span className="text-[13px] font-bold tabular-nums" style={RANK_COLOR[r.rank] ? { color: RANK_COLOR[r.rank] } : onInkMuted}>
                            {r.rank}
                        </span>
                        <span className="min-w-0 truncate text-[13px] font-medium" style={onInk}>{r.name}</span>
                        <span className="text-right text-[15px] font-bold tabular-nums" style={onInk}>{r.points}</span>
                        <span className="text-right text-[13px] tabular-nums" style={onInkMuted}>{r.played}</span>
                        <span className="text-right text-[13px] tabular-nums" style={onInkMuted}>{r.won}</span>
                        {showByes && <span className="text-right text-[13px] tabular-nums" style={onInkMuted}>{r.byes}</span>}
                        {topUps && <span className="text-right text-[13px] tabular-nums" style={onInkMuted}>{r.topUpPoints ?? 0}</span>}
                    </button>
                ))}
            </div>
            <p className="text-[12px]" style={onInkMuted}>
                {topUps
                    ? 'Top-up: 12 points per game short of the most-played player, added when the tournament finishes. Ties: most wins, then shared place.'
                    : "Byes earn 12 points and don't count as wins. Ties: most wins, then shared place."}
            </p>

            {selected && (
                <div
                    className="fixed inset-0 z-40 flex items-end justify-center"
                    style={{ backgroundColor: 'hsl(var(--event-ink)/0.6)' }}
                    onClick={() => setSelected(null)}
                >
                    <div
                        className="mx-auto w-full max-w-lg space-y-3 rounded-t-[28px] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
                        style={ink}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <p className="text-[17px] font-bold" style={onInk}>{selected.name}</p>
                        <div className="space-y-1.5 text-[14px]" style={onInk}>
                            <p>Match points: {selected.matchPoints}</p>
                            <p>Golden point bonus: {selected.bonusPoints}</p>
                            {topUps ? (
                                <p>Top-up: {selected.topUpPoints ?? 0} pts</p>
                            ) : (
                                <p>{selected.byes} byes · {selected.byePoints} pts</p>
                            )}
                        </div>
                        <button
                            onClick={() => setSelected(null)}
                            className="h-12 w-full rounded-2xl text-[14px] font-semibold"
                            style={onInkMuted}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
