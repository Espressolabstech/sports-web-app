import { useEffect, useMemo, useState } from 'react';
import type { StandingsRow, TournamentEvent } from '../../../lib/public-events';
import { onInk, onInkMuted, ink } from './organizer-ui';
import AmericanoMatchesTab from './AmericanoMatchesTab';
import { Leaderboard, type StandingRow } from './Leaderboard';
import { toHostEvent } from './toHostEvent';

type LiveTab = 'matches' | 'standings';

function elapsedLabel(startedAt: Date | null, now: number) {
    if (!startedAt) return '0:00:00';
    const sec = Math.max(0, Math.floor((now - startedAt.getTime()) / 1000));
    const h = Math.floor(sec / 3600);
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
    const x = String(sec % 60).padStart(2, '0');
    return `${h}:${m}:${x}`;
}

export default function HostLiveView({ event, table }: { event: TournamentEvent; table: StandingsRow[] }) {
    const [liveTab, setLiveTab] = useState<LiveTab>('matches');
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, []);
    const host = useMemo(() => toHostEvent(event), [event]);
    const kingMode = event.scheduleMode === 'KING_OF_COURT';
    const mexicano = event.format.toLowerCase().includes('mexicano');
    const rows = table as StandingRow[];
    const done = event.matches.filter((m) => m.state === 'completed').length;

    return (
        <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={onInkMuted}>
                        {event.skillLevel}
                    </p>
                    <p className="text-[24px] font-bold leading-tight" style={onInk}>
                        {liveTab === 'standings' ? 'Standings' : 'Live matches'}
                    </p>
                </div>
                <span
                    className="mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold tabular-nums"
                    style={{ backgroundColor: 'hsl(var(--event-on-ink)/0.08)', ...onInk }}
                >
                    {elapsedLabel(event.startedAt, now)}
                </span>
            </div>

            {liveTab === 'matches' && (
                <>
                    <div>
                        <p className="text-[12px]" style={onInkMuted}>
                            {done} of {event.matches.length} matches complete
                        </p>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'hsl(var(--event-on-ink)/0.1)' }}>
                            <div
                                className="h-full rounded-full"
                                style={{
                                    width: `${event.matches.length ? (done / event.matches.length) * 100 : 0}%`,
                                    backgroundColor: 'hsl(var(--event-accent))',
                                }}
                            />
                        </div>
                    </div>
                </>
            )}

            <div className="flex gap-1 rounded-2xl p-1" style={{ backgroundColor: 'hsl(var(--event-ink-soft))' }}>
                {(['matches', 'standings'] as const).map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => setLiveTab(t)}
                        className="h-10 flex-1 rounded-xl text-[13px] font-semibold capitalize"
                        style={liveTab === t ? { backgroundColor: 'hsl(var(--event-accent))', color: 'hsl(var(--event-accent-foreground))' } : onInkMuted}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {liveTab === 'matches' ? (
                event.matches.length === 0 ? (
                    <p className="rounded-2xl px-6 py-12 text-center text-[13px]" style={{ ...ink, ...onInkMuted }}>
                        Matches appear once the tournament starts.
                    </p>
                ) : (
                    <AmericanoMatchesTab event={host} />
                )
            ) : (
                <Leaderboard rows={rows} showByes={!mexicano && !kingMode} topUps={kingMode} />
            )}
        </div>
    );
}
