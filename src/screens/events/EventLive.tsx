import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, MapPin, RefreshCw, Trophy, Users, Zap } from 'lucide-react';
import {
    cohortStatus,
    cohortsOf,
    currentRound,
    fetchEvent,
    getRegistration,
    nameOf,
    standings,
    type EventSkill,
} from '../../lib/public-events';
import { Podium } from '../../components/events/Podium';
import { AnimatedLoader } from '../../components/AnimatedLoader';

const ink = { backgroundColor: 'hsl(var(--event-ink))' };
const card = { backgroundColor: 'hsl(var(--event-ink-soft))' };
const onInk = { color: 'hsl(var(--event-on-ink))' };
const onInkMuted = { color: 'hsl(var(--event-on-ink-muted))' };

export default function EventLive() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [lastRefreshed, setLastRefreshed] = useState(() => new Date());
    const [cohortOverride, setCohortOverride] = useState<EventSkill | null>(null);

    const {
        data: event,
        isLoading,
        isFetching,
        refetch,
    } = useQuery({
        queryKey: ['public-event', slug],
        queryFn: () => fetchEvent(slug!),
        enabled: !!slug,
        refetchInterval: (query) => (query.state.data?.phase === 'live' ? 15000 : false),
    });

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center" style={ink}>
                <AnimatedLoader />
            </div>
        );
    }

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

    const cohorts = cohortsOf(event);
    const paramCohort = searchParams.get('cohort') as EventSkill | null;
    const reg = slug ? getRegistration(slug) : null;
    const activeCohort =
        (cohortOverride && cohorts.includes(cohortOverride) ? cohortOverride : null) ??
        (paramCohort && cohorts.includes(paramCohort) ? paramCohort : null) ??
        (reg && cohorts.includes(reg.skill) ? reg.skill : null) ??
        cohorts[0] ??
        null;

    const table = activeCohort ? standings(event, activeCohort) : [];
    const podiumRows = table.filter((r) => r.rank <= 3).slice(0, 3);
    const rest = table.filter((r) => !podiumRows.includes(r));
    const round = activeCohort ? currentRound(event, activeCohort) : null;
    const status = activeCohort ? cohortStatus(event, activeCohort) : 'not_started';
    const isLive = status === 'live';

    const mapsHref = `https://maps.google.com/?q=${encodeURIComponent(
        `${event.venueName}, ${event.venueLocation}`,
    )}`;

    const subMenu = [
        { to: mapsHref, external: true, icon: MapPin, label: event.venueName },
        { to: `/events/${event.slug}/rules`, icon: Zap, label: 'Format' },
        {
            to: `/events/${event.slug}/players${activeCohort ? `?cohort=${activeCohort}` : ''}`,
            icon: Users,
            label: 'Players',
        },
    ];

    const doRefresh = () => {
        refetch();
        setLastRefreshed(new Date());
    };

    return (
        <div className="min-h-screen pb-10" style={ink}>
            <header
                className="sticky top-0 z-10 backdrop-blur-md"
                style={{
                    backgroundColor: 'hsl(var(--event-ink)/0.92)',
                    borderBottom: '1px solid hsl(var(--event-on-ink)/0.1)',
                }}
            >
                <div className="mx-auto max-w-lg px-4 py-3">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(`/events/${event.slug}`)}
                            aria-label="Back"
                            className="-ml-1.5 rounded-full p-1.5 active:scale-95"
                        >
                            <ArrowLeft className="h-5 w-5" style={onInk} />
                        </button>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] uppercase tracking-wider" style={onInkMuted}>
                                {event.title}
                            </p>
                            <h1 className="text-base font-bold" style={onInk}>
                                Live scoring
                            </h1>
                        </div>
                        <span
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide"
                            style={
                                isLive
                                    ? {
                                          backgroundColor: 'hsl(var(--event-accent))',
                                          color: 'hsl(var(--event-accent-foreground))',
                                      }
                                    : {
                                          backgroundColor: 'hsl(var(--event-on-ink)/0.1)',
                                          color: 'hsl(var(--event-on-ink)/0.8)',
                                      }
                            }
                        >
                            {isLive && (
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-70" />
                                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
                                </span>
                            )}
                            {status === 'live' ? 'Live' : status === 'completed' ? 'Ended' : 'Not started'}
                        </span>
                    </div>

                    {cohorts.length > 1 && (
                        <div className="mt-3 flex gap-1.5">
                            {cohorts.map((c) => (
                                <button
                                    key={c}
                                    onClick={() => setCohortOverride(c)}
                                    className="flex-1 rounded-full px-3 py-1.5 text-[12px] font-semibold"
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

                    <div className="mt-3 -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5">
                        {subMenu.map((t) => {
                            const inner = (
                                <>
                                    <t.icon className="h-3.5 w-3.5" style={{ color: 'hsl(var(--event-lime))' }} />
                                    {t.label}
                                </>
                            );
                            const cls =
                                'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-medium active:scale-[0.97]';
                            const style = {
                                backgroundColor: 'hsl(var(--event-ink-soft))',
                                color: 'hsl(var(--event-on-ink))',
                            };
                            return t.external ? (
                                <a key={t.label} href={t.to} target="_blank" rel="noreferrer" className={cls} style={style}>
                                    {inner}
                                </a>
                            ) : (
                                <Link key={t.label} to={t.to} className={cls} style={style}>
                                    {inner}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-lg space-y-4 px-4 pt-4">
                <div className="flex items-center justify-between px-1">
                    <p className="text-[12px]" style={onInkMuted}>
                        {status === 'live'
                            ? round
                                ? `Round ${round.roundNumber} in progress`
                                : `${activeCohort} is live`
                            : status === 'completed'
                              ? `${activeCohort} has ended`
                              : `${activeCohort} hasn't started yet`}
                        {' · '}
                        Updated {format(lastRefreshed, 'h:mm a')}
                    </p>
                    <button
                        onClick={doRefresh}
                        disabled={isFetching}
                        aria-label="Refresh scores"
                        className="flex h-8 w-8 items-center justify-center rounded-full active:scale-90 disabled:opacity-50"
                        style={{ backgroundColor: 'hsl(var(--event-on-ink)/0.1)' }}
                    >
                        <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} style={onInk} />
                    </button>
                </div>

                {podiumRows.length === 3 ? (
                    <Podium rows={podiumRows} />
                ) : table.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-1.5 rounded-2xl px-6 py-12 text-center" style={card}>
                        <Trophy className="h-6 w-6" style={{ color: 'hsl(var(--event-lime))' }} />
                        <p className="text-sm font-semibold" style={onInk}>
                            No scores yet
                        </p>
                        <p className="text-xs" style={onInkMuted}>
                            Check back once the first round is scored.
                        </p>
                    </div>
                ) : null}

                {rest.length > 0 && (
                    <>
                        <p
                            className="px-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                            style={onInkMuted}
                        >
                            Full standings
                        </p>
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

                {round && round.matches.length > 0 && (
                    <>
                        <p
                            className="px-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                            style={onInkMuted}
                        >
                            Round {round.roundNumber} · on court
                        </p>
                        <div className="space-y-2.5">
                            {round.matches.map((m) => {
                                const scored = m.scoreA !== null && m.scoreB !== null;
                                return (
                                    <div
                                        key={m.court}
                                        className="rounded-2xl p-3.5"
                                        style={card}
                                    >
                                        <p
                                            className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em]"
                                            style={onInkMuted}
                                        >
                                            Court {m.court}
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <div className="min-w-0 flex-1 text-[13px] font-medium" style={onInk}>
                                                <p className="truncate">{nameOf(event, m.teamAEntrant1Id)}</p>
                                                <p className="truncate">{nameOf(event, m.teamAEntrant2Id)}</p>
                                            </div>
                                            <div className="shrink-0 text-center text-[20px] font-extrabold tabular-nums">
                                                {scored ? (
                                                    <span style={onInk}>
                                                        {m.scoreA} – {m.scoreB}
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] font-semibold uppercase" style={onInkMuted}>
                                                        Playing
                                                    </span>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1 text-right text-[13px] font-medium" style={onInk}>
                                                <p className="truncate">{nameOf(event, m.teamBEntrant1Id)}</p>
                                                <p className="truncate">{nameOf(event, m.teamBEntrant2Id)}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                <p className="flex items-center justify-center gap-1.5 px-1 pt-2 pb-6 text-center text-xs" style={onInkMuted}>
                    <RefreshCw className="h-3 w-3" />
                    {status === 'live'
                        ? 'Pull down or tap refresh to see the latest scores.'
                        : status === 'completed'
                          ? 'These are the final results.'
                          : 'Check back once this cohort starts.'}
                </p>
            </main>
        </div>
    );
}
