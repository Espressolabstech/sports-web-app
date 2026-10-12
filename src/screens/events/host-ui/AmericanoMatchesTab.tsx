// Unified "Matches" view for a live Americano tournament — on-court cards,
// the bench, a round-by-round game-progress grid, an "all matchups"
// archive, and a tap-to-score pad. Replaces the old separate Scoring and
// Schedule tabs with one integrated view.
import { useMemo, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { nameOf, MATCH_POINTS, type OrganizerEvent, type OrganizerMatch } from './types';
import { courtColor } from './types';
import { SectionLabel, OrgCard, onInk, onInkMuted, accentBg } from './organizer-ui';
import { cn } from '../../../utils/twMerge';

const bandBorder = { borderColor: 'hsl(var(--event-on-ink)/0.13)' };

const teamNames = (event: OrganizerEvent, ids: [string, string]) => ids.map((id) => nameOf(event, id));

interface RoundGroup {
    round: number;
    matches: OrganizerMatch[];
    resting: string[];
}

// ── Score pad — tap a court card to open this, pick a side then a number ──

function ScorePad({
    event,
    match,
    round,
    game,
    canScore,
    onClose,
    onSave,
}: {
    event: OrganizerEvent;
    match: OrganizerMatch;
    round: number;
    game: number;
    canScore: boolean;
    onClose: () => void;
    onSave: (a: number, b: number, golden?: 'A' | 'B') => void;
}) {
    const [side, setSide] = useState<'A' | 'B'>('A');
    const [picked, setPicked] = useState<number | null>(
        match.scoreA !== null && match.scoreB !== null ? match.scoreA : null,
    );
    const [pickedSide, setPickedSide] = useState<'A' | 'B'>('A');
    const [golden, setGolden] = useState<'A' | 'B' | undefined>(match.goldenPointWinner ?? undefined);
    const scoreA = picked === null ? null : pickedSide === 'A' ? picked : MATCH_POINTS - picked;
    const scoreB = scoreA === null ? null : MATCH_POINTS - scoreA;
    const tie = scoreA === 12;
    const needsGolden = tie && !!event.goldenPoint;
    const ready = scoreA !== null && (!needsGolden || !!golden);
    const teamLabel = (ids: [string, string]) => ids.map((id) => nameOf(event, id).split(' ')[0]).join(' & ');
    const activeStyle = { backgroundColor: 'hsl(var(--event-accent))', color: 'hsl(var(--event-ink))' };
    const quiet = { backgroundColor: 'hsl(var(--event-on-ink)/0.07)', color: 'hsl(var(--event-on-ink))' };
    const submitted = match.scoreA !== null && match.scoreB !== null;

    return (
        <div
            className="fixed inset-0 z-[60] flex items-end justify-center"
            style={{ backgroundColor: 'hsl(var(--event-ink)/0.7)' }}
            onClick={onClose}
        >
            <div
                className="mx-auto w-full max-w-lg rounded-t-[28px] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
                style={{ backgroundColor: 'hsl(var(--event-ink-soft))' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between">
                    <SectionLabel>
                        {event.scheduleMode === 'KING_OF_COURT'
                            ? `${match.state === 'queued' ? 'Waiting' : `Court ${match.court}`} · Game ${game}`
                            : `${match.state === 'queued' ? `Round ${round}` : `Court ${match.court} · Round ${round}`} · Game ${game}`}
                    </SectionLabel>
                    <button onClick={onClose} aria-label="Close">
                        <X className="h-5 w-5" style={onInkMuted} />
                    </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                    {(['A', 'B'] as const).map((s) => {
                        const ids = s === 'A' ? match.teamA : match.teamB;
                        const value = s === 'A' ? scoreA : scoreB;
                        const on = canScore && side === s;
                        return (
                            <button
                                key={s}
                                type="button"
                                disabled={!canScore}
                                onClick={() => setSide(s)}
                                className="flex min-h-24 flex-col items-center justify-center rounded-xl border px-2 py-3 text-center transition-colors"
                                style={{
                                    borderColor: on ? 'hsl(var(--event-accent))' : 'hsl(var(--event-on-ink)/0.13)',
                                    backgroundColor: on ? 'hsl(var(--event-accent)/0.08)' : 'transparent',
                                }}
                            >
                                <span className="text-[32px] font-extrabold tabular-nums leading-none" style={onInk}>
                                    {value ?? '–'}
                                </span>
                                <span className="mt-2 break-words text-[12px] font-semibold leading-tight" style={onInkMuted}>
                                    {teamLabel(ids)}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {canScore ? (
                    <>
                        <p className="mt-4 text-[12px] font-semibold" style={onInkMuted}>
                            Points for {teamLabel(side === 'A' ? match.teamA : match.teamB)} — the other side fills to {MATCH_POINTS}
                        </p>
                        <div className="mt-2 grid grid-cols-6 gap-1.5">
                            {Array.from({ length: MATCH_POINTS }, (_, i) => i + 1).map((n) => {
                                const on = picked !== null && (side === 'A' ? scoreA : scoreB) === n;
                                return (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() => {
                                            setPicked(n);
                                            setPickedSide(side);
                                            if (n !== 12) setGolden(undefined);
                                        }}
                                        className="h-11 rounded-lg text-[15px] font-bold tabular-nums"
                                        style={on ? activeStyle : quiet}
                                    >
                                        {n}
                                    </button>
                                );
                            })}
                        </div>

                        {needsGolden && (
                            <div className="mt-4 space-y-2">
                                <p className="text-[12px] font-semibold" style={onInkMuted}>
                                    12–12 · Who won the golden point?
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['A', 'B'] as const).map((s) => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => setGolden(s)}
                                            className="h-11 rounded-lg px-2 text-[13px] font-bold"
                                            style={golden === s ? activeStyle : quiet}
                                        >
                                            {teamLabel(s === 'A' ? match.teamA : match.teamB)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button
                            className="mt-5 h-12 w-full rounded-2xl text-[15px] font-bold disabled:opacity-40"
                            style={ready ? accentBg : undefined}
                            disabled={!ready}
                            onClick={() => scoreA !== null && scoreB !== null && onSave(scoreA, scoreB, needsGolden ? golden : undefined)}
                        >
                            {submitted ? 'Update score' : 'Save score'}
                        </button>
                    </>
                ) : (
                    <p className="mt-4 text-[13px]" style={onInkMuted}>
                        This match hasn't started yet.
                    </p>
                )}
            </div>
        </div>
    );
}

// ── Main tab ───────────────────────────────────────────────────────────────

export default function AmericanoMatchesTab({
    event,
    onScore,
}: {
    event: OrganizerEvent;
    onScore?: (match: OrganizerMatch, a: number, b: number, golden?: 'A' | 'B') => void;
}) {
    const [sheet, setSheet] = useState<{ match: OrganizerMatch; round: number } | null>(null);
    // King of the Court has no rounds: every game is one list, in play order.
    const kingMode = event.scheduleMode === 'KING_OF_COURT';

    const rounds: RoundGroup[] = useMemo(() => {
        if (kingMode) {
            return [
                {
                    round: 1,
                    matches: [...event.matches].sort((a, b) => a.queueIndex - b.queueIndex),
                    resting: [],
                },
            ];
        }
        const byRound = new Map<number, OrganizerMatch[]>();
        for (const m of event.matches) {
            if (!byRound.has(m.roundNumber)) byRound.set(m.roundNumber, []);
            byRound.get(m.roundNumber)!.push(m);
        }
        const checkedInIds = event.entrants.filter((e) => e.checkedIn && !e.waitlisted).map((e) => e.id);
        const explicitResting = new Map(event.americanoRounds.map((r) => [r.roundNumber, r.resting]));
        return [...byRound.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([round, matches]) => {
                // Batches are generated adaptively — a player can be absent
                // from this round simply because they're still mid-match in
                // an older, slower one, not because they're actually
                // resting. Prefer the batch's own recorded resting list;
                // only fall back to "not playing this round" for matches
                // generated before that was tracked.
                const resting =
                    explicitResting.get(round) ??
                    checkedInIds.filter((id) => !new Set(matches.flatMap((m) => [...m.teamA, ...m.teamB])).has(id));
                return {
                    round,
                    matches: [...matches].sort((a, b) => (a.court ?? 0) - (b.court ?? 0)),
                    resting,
                };
            });
    }, [event.matches, event.entrants, event.americanoRounds, kingMode]);

    const matchNumbers = useMemo(() => {
        const numbers = new Map<number, number>();
        for (const m of event.matches) numbers.set(m.queueIndex, m.queueIndex + 1);
        return numbers;
    }, [event.matches]);

    const activeEntries = useMemo(
        () =>
            rounds
                .flatMap((round) => round.matches.map((match) => ({ match, round: round.round })))
                .filter(({ match }) => match.state === 'active'),
        [rounds],
    );

    const progress = useMemo(
        () => ({
            complete: event.matches.filter((m) => m.state === 'completed').length,
            total: event.matches.length,
        }),
        [event.matches],
    );

    const activePlayers = new Set(activeEntries.flatMap(({ match }) => [...match.teamA, ...match.teamB]));
    const activeResting = event.entrants.filter((e) => e.checkedIn && !e.waitlisted && !activePlayers.has(e.id));

    const matchCard = ({ match, round }: { match: OrganizerMatch; round: number }, label: string) => {
        const [playerA1, playerA2] = teamNames(event, match.teamA);
        const [playerB1, playerB2] = teamNames(event, match.teamB);
        const completed = match.state === 'completed';
        const active = match.state === 'active';
        return (
            <button
                key={`${round}-${match.court}-${match.queueIndex}`}
                type="button"
                onClick={() => setSheet({ match, round })}
                aria-label={`${active ? 'Score' : completed ? 'View score for' : 'View'} Court ${match.court}, game ${matchNumbers.get(match.queueIndex)}, round ${round}`}
                className="flex h-auto w-full min-w-0 flex-col overflow-hidden rounded-2xl border p-0 text-left"
                style={{
                    backgroundColor: active ? 'hsl(var(--event-ink-soft))' : 'hsl(var(--event-on-ink)/0.05)',
                    borderColor: active ? 'hsl(var(--event-on-ink)/0.16)' : 'hsl(var(--event-on-ink)/0.09)',
                    color: 'hsl(var(--event-on-ink))',
                }}
            >
                <span
                    className="flex w-full items-center justify-center px-3 pt-2.5 text-[10px] font-semibold uppercase tracking-[0.08em]"
                    style={{ color: label.startsWith('Court') ? courtColor(match.court ?? 1) : 'hsl(var(--event-on-ink-muted))' }}
                >
                    {label}
                </span>
                <span className="flex w-full flex-1 flex-col justify-center px-3 py-3 text-center">
                    <span className={cn('flex flex-col gap-1 break-words font-semibold leading-snug', active ? 'text-[14px]' : 'text-[13px]')}>
                        <span className="block">{playerA1}</span>
                        <span className="block">{playerA2}</span>
                    </span>
                    <span className="my-1.5 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.14em]" style={onInkMuted}>
                        <span className="h-px flex-1" style={{ backgroundColor: 'hsl(var(--event-on-ink)/0.14)' }} />
                        vs
                        <span className="h-px flex-1" style={{ backgroundColor: 'hsl(var(--event-on-ink)/0.14)' }} />
                    </span>
                    <span className={cn('flex flex-col gap-1 break-words font-semibold leading-snug', active ? 'text-[14px]' : 'text-[13px]')}>
                        <span className="block">{playerB1}</span>
                        <span className="block">{playerB2}</span>
                    </span>
                </span>
                <span className="flex w-full items-center justify-between gap-2 border-t px-3 py-2" style={bandBorder}>
                    <span className="min-w-0 truncate text-[11px] font-medium tabular-nums" style={onInkMuted}>
                        Game {matchNumbers.get(match.queueIndex)}{kingMode ? '' : ` · R${round}`}
                    </span>
                    {active ? (
                        <span className="flex shrink-0 items-center gap-1 text-[12px] font-bold" style={{ color: 'hsl(var(--event-accent))' }}>
                            {onScore ? 'Score' : 'View'} <ArrowRight className="h-3 w-3" aria-hidden="true" />
                        </span>
                    ) : completed ? (
                        <span className="shrink-0 text-[12px] font-bold tabular-nums" style={onInk}>
                            {match.scoreA}–{match.scoreB}
                        </span>
                    ) : null}
                </span>
            </button>
        );
    };

    if (rounds.length === 0) {
        return (
            <OrgCard>
                <p className="text-[13px]" style={onInkMuted}>
                    The schedule appears once the tournament starts.
                </p>
            </OrgCard>
        );
    }

    return (
        <div className="space-y-6">
            <section className="space-y-4" aria-labelledby="on-court-heading">
                <div className="flex items-center gap-2.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: 'hsl(var(--event-accent))' }} aria-hidden="true" />
                    <h2 id="on-court-heading" className="text-[17px] font-bold leading-none" style={onInk}>
                        On court now
                    </h2>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                    {Array.from({ length: event.courts }, (_, index) => {
                        const court = index + 1;
                        const active = activeEntries.find(({ match }) => match.court === court);
                        return active ? (
                            matchCard(active, `Court ${court}`)
                        ) : (
                            <div
                                key={`empty-${court}`}
                                className="flex min-h-36 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed"
                                style={{ borderColor: 'hsl(var(--event-on-ink)/0.12)', backgroundColor: 'hsl(var(--event-on-ink)/0.03)' }}
                            >
                                <span className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: courtColor(court) }}>
                                    Court {court}
                                </span>
                                <span className="px-3 text-center text-[11px]" style={onInkMuted}>
                                    Waiting for next match
                                </span>
                            </div>
                        );
                    })}
                </div>
                {activeResting.length > 0 && (
                    <div
                        className="rounded-2xl border px-3.5 py-3"
                        style={{ borderColor: 'hsl(var(--event-on-ink)/0.09)', backgroundColor: 'hsl(var(--event-on-ink)/0.03)' }}
                    >
                        <p className="text-[11px] font-bold uppercase tracking-[0.08em]" style={onInkMuted}>
                            On bench now
                        </p>
                        <p className="mt-1.5 text-[13px] font-medium leading-snug" style={onInk}>
                            {activeResting.map((e) => e.name).join(' · ')}
                        </p>
                    </div>
                )}
                {progress.total > 0 && (
                    <div
                        className="flex items-center justify-between rounded-2xl border px-3.5 py-3"
                        style={{ borderColor: 'hsl(var(--event-on-ink)/0.09)', backgroundColor: 'hsl(var(--event-on-ink)/0.03)' }}
                    >
                        <p className="text-[11px] font-bold uppercase tracking-[0.08em]" style={onInkMuted}>
                            Games completed
                        </p>
                        <p className="text-[20px] font-extrabold tabular-nums" style={onInk} aria-label={`${progress.complete} games completed`}>
                            {progress.complete}
                        </p>
                    </div>
                )}
            </section>

            {sheet && (
                <ScorePad
                    event={event}
                    match={sheet.match}
                    round={sheet.round}
                    game={matchNumbers.get(sheet.match.queueIndex) ?? 0}
                    canScore={!!onScore && sheet.match.state !== 'queued'}
                    onClose={() => setSheet(null)}
                    onSave={(a, b, golden) => {
                        onScore?.(sheet.match, a, b, golden);
                        setSheet(null);
                    }}
                />
            )}
        </div>
    );
}
