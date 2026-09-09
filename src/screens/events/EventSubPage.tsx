import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Lock, MapPin, Timer, Trophy, Users, Zap } from 'lucide-react';
import {
    cohortStatus,
    cohortsOf,
    fetchEvent,
    fillStatus,
    getRegistration,
    shortName,
    standings,
    type EventRegistration,
    type EventSkill,
    type RosterPlayer,
    type TournamentEvent,
} from '../../lib/public-events';
import { Podium } from '../../components/events/Podium';

type Section = 'rules' | 'players' | 'standings';

const TITLES: Record<Section, string> = {
    rules: 'Format',
    players: 'Players',
    standings: 'Standings',
};

const ink = { backgroundColor: 'hsl(var(--event-ink))' };
const card = { backgroundColor: 'hsl(var(--event-ink-soft))' };
const onInk = { color: 'hsl(var(--event-on-ink))' };
const onInkMuted = { color: 'hsl(var(--event-on-ink-muted))' };

export default function EventSubPage({ section }: { section: Section }) {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [reg, setReg] = useState<EventRegistration | null>(null);
    const [cohortOverride, setCohortOverride] = useState<EventSkill | null>(null);

    const { data: event } = useQuery({
        queryKey: ['public-event', slug],
        queryFn: () => fetchEvent(slug!),
        enabled: !!slug,
        // Standings/players update as the organizer enters scores — poll
        // while the tournament is live rather than requiring a manual pull.
        refetchInterval: (query) => (query.state.data?.phase === 'live' ? 10000 : false),
    });

    useEffect(() => {
        if (!slug) return;
        const sync = () => setReg(getRegistration(slug));
        sync();
        window.addEventListener('bookease-registrations', sync);
        return () => window.removeEventListener('bookease-registrations', sync);
    }, [slug]);

    const roster: (RosterPlayer & { isMe: boolean })[] = useMemo(() => {
        if (!event) return [];
        const mine =
            reg && !event.roster.some((p) => p.id === reg.entrantId)
                ? [
                      {
                          id: 'me',
                          name: shortName(reg.name),
                          skill: reg.skill,
                          createdAt: reg.createdAt,
                          isMe: true,
                      },
                  ]
                : [];
        return [
            ...mine,
            ...event.roster.map((p) => ({ ...p, isMe: reg ? p.id === reg.entrantId : false })),
        ];
    }, [event, reg]);

    if (!event) {
        return (
            <div
                className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center"
                style={ink}
            >
                <p className="text-base font-semibold" style={onInk}>
                    Event not found
                </p>
                <Link to="/events" className="text-sm font-medium" style={{ color: 'hsl(var(--event-accent))' }}>
                    Browse all events
                </Link>
            </div>
        );
    }

    const gated = section === 'players' && !reg;

    const cohorts = cohortsOf(event);
    const paramCohort = searchParams.get('cohort') as EventSkill | null;
    const activeCohort =
        (cohortOverride && cohorts.includes(cohortOverride) ? cohortOverride : null) ??
        (paramCohort && cohorts.includes(paramCohort) ? paramCohort : null) ??
        (reg && cohorts.includes(reg.skill) ? reg.skill : null) ??
        cohorts[0];

    const cohortRoster = activeCohort ? roster.filter((p) => p.skill === activeCohort) : roster;

    return (
        <div className="min-h-screen pb-32" style={ink}>
            <header
                className="sticky top-0 z-10 backdrop-blur-md"
                style={{
                    backgroundColor: 'hsl(var(--event-ink)/0.92)',
                    borderBottom: '1px solid hsl(var(--event-on-ink)/0.1)',
                }}
            >
                <div className="mx-auto flex max-w-lg items-center gap-2 px-2 py-2">
                    <button
                        onClick={() => navigate(`/events/${event.slug}`)}
                        aria-label="Back"
                        className="flex h-11 w-11 items-center justify-center rounded-full active:scale-95"
                    >
                        <ArrowLeft className="h-5 w-5" style={onInk} />
                    </button>
                    <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold" style={onInk}>
                            {TITLES[section]}
                        </p>
                        <p className="truncate text-[11px]" style={onInkMuted}>
                            {event.title}
                        </p>
                    </div>
                </div>
                {section !== 'rules' && cohorts.length > 1 && (
                    <div className="mx-auto flex max-w-lg gap-1.5 overflow-x-auto px-3 pb-2.5">
                        {cohorts.map((c) => (
                            <button
                                key={c}
                                onClick={() => setCohortOverride(c)}
                                className="shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-semibold"
                                style={
                                    c === activeCohort
                                        ? {
                                              backgroundColor: 'hsl(var(--event-accent))',
                                              color: 'hsl(var(--event-accent-foreground))',
                                          }
                                        : {
                                              backgroundColor: 'hsl(var(--event-on-ink)/0.08)',
                                              color: 'hsl(var(--event-on-ink))',
                                          }
                                }
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                )}
            </header>

            <main className="mx-auto max-w-lg px-4 py-4">
                {section === 'rules' && <Rules event={event} />}
                {section === 'players' &&
                    (gated ? (
                        <LockedPlayers event={event} />
                    ) : (
                        <Players roster={cohortRoster} capacity={event.capacity} />
                    ))}
                {section === 'standings' && activeCohort && (
                    <Standings event={event} cohort={activeCohort} />
                )}
            </main>

            {gated && (
                <div
                    className="fixed inset-x-0 bottom-0 z-20 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
                    style={{
                        backgroundColor: 'hsl(var(--event-ink)/0.92)',
                        borderTop: '1px solid hsl(var(--event-on-ink)/0.1)',
                    }}
                >
                    <div className="mx-auto flex max-w-lg items-center gap-4 px-4 py-3">
                        <div className="min-w-0 shrink-0">
                            <p className="text-[11px] uppercase tracking-wider" style={onInkMuted}>
                                Entry
                            </p>
                            <p className="text-xl font-black leading-tight" style={onInk}>
                                ₹{event.priceInr.toLocaleString('en-IN')}
                            </p>
                        </div>
                        {event.phase === 'upcoming' ? (
                            <Link
                                to={`/events/${event.slug}/register`}
                                className="inline-flex h-14 flex-1 items-center justify-center rounded-2xl text-[16px] font-black uppercase tracking-wide active:scale-[0.99]"
                                style={{
                                    backgroundColor: 'hsl(var(--event-accent))',
                                    color: 'hsl(var(--event-accent-foreground))',
                                }}
                            >
                                Register to see players
                            </Link>
                        ) : (
                            <span
                                className="inline-flex h-14 flex-1 items-center justify-center rounded-2xl text-[15px] font-semibold"
                                style={{
                                    backgroundColor: 'hsl(var(--event-ink-soft))',
                                    color: 'hsl(var(--event-on-ink-muted))',
                                }}
                            >
                                Registration closed
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function Rules({ event }: { event: TournamentEvent }) {
    const rows = [
        {
            icon: MapPin,
            label: 'Venue',
            value: `${event.venueName}${event.venueLocation ? ` · ${event.venueLocation}` : ''}`,
        },
        { icon: Zap, label: 'Format', value: `${event.format} · ${event.sport}` },
        {
            icon: Timer,
            label: 'Play',
            value: `${event.courts} courts · ${event.roundMinutes} min rounds · ${event.pointsPerRound} pts`,
        },
        { icon: Users, label: 'Cohorts', value: event.skillLevels.join(', ') || '—' },
    ];

    return (
        <div className="space-y-3.5">
            <section className="space-y-3 rounded-2xl p-4" style={card}>
                {rows.map((r) => (
                    <div key={r.label} className="flex items-start gap-3">
                        <r.icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'hsl(var(--event-lime))' }} />
                        <div className="min-w-0 flex-1">
                            <p className="text-[11px] uppercase tracking-[0.1em]" style={onInkMuted}>
                                {r.label}
                            </p>
                            <p className="text-[14px] font-medium" style={onInk}>
                                {r.value}
                            </p>
                        </div>
                    </div>
                ))}
            </section>

            {event.description && (
                <section className="space-y-2 rounded-2xl p-4" style={card}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={onInkMuted}>
                        About this tournament
                    </p>
                    <p className="text-[14px] leading-relaxed" style={{ color: 'hsl(var(--event-on-ink)/0.85)' }}>
                        {event.description}
                    </p>
                </section>
            )}
        </div>
    );
}

function LockedPlayers({ event }: { event: TournamentEvent }) {
    const fill = fillStatus(event);
    return (
        <div className="relative overflow-hidden rounded-2xl" style={card}>
            <div className="pointer-events-none select-none space-y-2 p-4 blur-[5px]" aria-hidden>
                {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="flex items-center gap-3">
                        <span
                            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                            style={{ backgroundColor: 'hsl(var(--event-lime)/0.2)', color: 'hsl(var(--event-lime))' }}
                        >
                            {n}
                        </span>
                        <span className="h-3 flex-1 rounded-full" style={{ backgroundColor: 'hsl(var(--event-on-ink)/0.18)' }} />
                    </div>
                ))}
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                <Lock className="h-6 w-6" style={{ color: 'hsl(var(--event-lime))' }} />
                <p className="mt-2 text-sm font-semibold" style={onInk}>
                    Register to see who's playing
                </p>
                <p className="mt-1 text-xs" style={onInkMuted}>
                    {fill.filled}/{event.capacity} spots taken
                </p>
            </div>
        </div>
    );
}

function Players({
    roster,
    capacity,
}: {
    roster: (RosterPlayer & { isMe: boolean })[];
    capacity: number;
}) {
    if (roster.length === 0) {
        return (
            <div className="rounded-2xl px-6 py-14 text-center" style={card}>
                <Users className="mx-auto h-8 w-8" style={{ color: 'hsl(var(--event-lime))' }} />
                <p className="mt-3 text-[15px] font-semibold" style={onInk}>
                    No one's registered yet
                </p>
                <p className="mt-1 text-[13px]" style={onInkMuted}>
                    Be the first to grab a spot.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <p className="px-1 text-[12px]" style={onInkMuted}>
                {roster.length}/{capacity} registered
            </p>
            <div className="overflow-hidden rounded-2xl" style={card}>
                {roster.map((p, i) => (
                    <div
                        key={p.id}
                        className="flex items-center gap-3 px-4 py-3"
                        style={i > 0 ? { borderTop: '1px solid hsl(var(--event-on-ink)/0.08)' } : undefined}
                    >
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] font-medium" style={onInk}>
                                {p.name}
                                {p.isMe && (
                                    <span
                                        className="ml-2 text-[11px] font-semibold"
                                        style={{ color: 'hsl(var(--event-accent))' }}
                                    >
                                        You
                                    </span>
                                )}
                            </p>
                            <p className="truncate text-[12px]" style={onInkMuted}>
                                {p.skill}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function Standings({ event, cohort }: { event: TournamentEvent; cohort: EventSkill }) {
    const table = standings(event, cohort);
    const status = cohortStatus(event, cohort);
    const hasScores = table.some((r) => r.played > 0);

    if (status === 'not_started' || !hasScores) {
        return (
            <div className="rounded-2xl px-6 py-16 text-center" style={card}>
                <Trophy className="mx-auto h-9 w-9" style={{ color: 'hsl(var(--event-lime))' }} />
                <p className="mt-4 text-[16px] font-bold" style={onInk}>
                    No standings yet
                </p>
                <p className="mt-1.5 text-[13px] leading-snug" style={onInkMuted}>
                    Come back once the first round is scored.
                </p>
            </div>
        );
    }

    const podiumRows = table.filter((r) => r.rank <= 3).slice(0, 3);
    const rest = table.filter((r) => !podiumRows.includes(r));

    return (
        <div className="space-y-3.5">
            {status === 'completed' && (
                <p
                    className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                    style={onInkMuted}
                >
                    Final podium
                </p>
            )}
            {podiumRows.length === 3 && <Podium rows={podiumRows} />}

            {rest.length > 0 && (
                <>
                    {status === 'completed' && (
                        <p
                            className="px-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                            style={onInkMuted}
                        >
                            Full results
                        </p>
                    )}
                    <div className="overflow-hidden rounded-2xl" style={card}>
                        {rest.map((row, i) => (
                            <div
                                key={row.playerId}
                                className="flex items-center gap-3 px-4 py-3"
                                style={i > 0 ? { borderTop: '1px solid hsl(var(--event-on-ink)/0.08)' } : undefined}
                            >
                                <span
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                                    style={{
                                        backgroundColor: 'hsl(var(--event-on-ink)/0.08)',
                                        color: 'hsl(var(--event-on-ink-muted))',
                                    }}
                                >
                                    {row.rank}
                                </span>
                                <p className="min-w-0 flex-1 truncate text-[15px] font-medium" style={onInk}>
                                    {row.name}
                                </p>
                                <p className="text-xs" style={onInkMuted}>
                                    {row.won}/{row.played} won
                                </p>
                                <p className="w-12 text-right text-[15px] font-bold" style={onInk}>
                                    {row.points}
                                </p>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {podiumRows.length < 3 && rest.length === 0 && (
                <div className="overflow-hidden rounded-2xl" style={card}>
                    {podiumRows.map((row, i) => (
                        <div
                            key={row.playerId}
                            className="flex items-center gap-3 px-4 py-3"
                            style={i > 0 ? { borderTop: '1px solid hsl(var(--event-on-ink)/0.08)' } : undefined}
                        >
                            <span
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                                style={{
                                    backgroundColor: 'hsl(var(--event-lime)/0.2)',
                                    color: 'hsl(var(--event-lime))',
                                }}
                            >
                                {row.rank}
                            </span>
                            <p className="min-w-0 flex-1 truncate text-[15px] font-medium" style={onInk}>
                                {row.name}
                            </p>
                            <p className="text-xs" style={onInkMuted}>
                                {row.won}/{row.played} won
                            </p>
                            <p className="w-12 text-right text-[15px] font-bold" style={onInk}>
                                {row.points}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            <p className="px-1 text-xs" style={onInkMuted}>
                {status === 'live' ? 'Updating after every round.' : 'Final result.'}
            </p>
        </div>
    );
}
