import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
    ArrowLeft,
    ChevronRight,
    CheckCircle2,
    Trophy,
    Zap,
    Ticket,
    MapPin,
    Users,
    X,
} from 'lucide-react';
import { useCountdown } from '../../components/events/Countdown';
import {
    cohortsOf,
    cohortStatus,
    fetchEvent,
    fillStatus,
    getRegistration,
    rosterIn,
    standings,
    type EventRegistration,
} from '../../lib/public-events';
import { AnimatedLoader } from '../../components/AnimatedLoader';

function MiniCountdown({ target }: { target: Date }) {
    const t = useCountdown(target);
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
        <p
            className="mt-1 text-[13px] font-medium tabular-nums"
            style={{ color: 'hsl(var(--event-on-ink-muted))' }}
        >
            Starts in{' '}
            <span style={{ color: 'hsl(var(--event-accent))' }}>
                {t.days > 0 ? `${t.days}d ` : ''}
                {pad(t.hours)}h {pad(t.minutes)}m {pad(t.seconds)}s
            </span>
        </p>
    );
}

export default function EventLanding() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [reg, setReg] = useState<EventRegistration | null>(null);
    const [zoom, setZoom] = useState(false);

    const { data: event, isLoading } = useQuery({
        queryKey: ['public-event', slug],
        queryFn: () => fetchEvent(slug!),
        enabled: !!slug,
        // No websocket/Realtime layer here, so poll while the tournament is
        // actually in progress (fill count, live badge) and stop otherwise.
        refetchInterval: (query) => (query.state.data?.phase === 'live' ? 15000 : false),
    });

    useEffect(() => {
        if (!slug) return;
        const sync = () => setReg(getRegistration(slug));
        sync();
        window.addEventListener('bookease-registrations', sync);
        return () => window.removeEventListener('bookease-registrations', sync);
    }, [slug]);

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <AnimatedLoader />
            </div>
        );
    }

    if (!event) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
                <p className="text-base font-semibold text-foreground">Event not found</p>
                <Link to="/events" className="text-sm font-medium text-primary">
                    Browse all events
                </Link>
            </div>
        );
    }

    const poster = event.posterUrl;
    const fill = fillStatus(event);
    const cohorts = cohortsOf(event);
    const previewCohort = reg?.skill ?? cohorts[0];
    const standingsPreview = previewCohort
        ? standings(event, previewCohort)
              .filter((r) => r.played > 0)
              .slice(0, 3)
        : [];
    const statusColor =
        fill.status === 'full'
            ? 'hsl(var(--event-full))'
            : fill.status === 'filling'
              ? 'hsl(var(--event-filling))'
              : 'hsl(var(--event-open))';

    const mapsHref = `https://maps.google.com/?q=${encodeURIComponent(
        `${event.venueName}, ${event.venueLocation}`,
    )}`;

    const area = event.venueLocation.split(',')[0].trim();

    const topTiles = [
        {
            to: mapsHref,
            external: true,
            icon: MapPin,
            label: event.venueName,
            hint: area,
        },
        {
            to: `/events/${event.slug}/rules`,
            icon: Zap,
            label: 'Format',
            hint: event.format,
        },
    ];

    const barPct = fill.status === 'full' ? 100 : fill.status === 'filling' ? 70 : 20;

    return (
        <div className="min-h-screen pb-36" style={{ backgroundColor: 'hsl(var(--event-ink))' }}>
            <header className="relative">
                {!poster && (
                    <div className="mx-auto max-w-lg px-4 pt-10">
                        <button
                            onClick={() => navigate('/events')}
                            aria-label="Back to events"
                            className="flex h-11 w-11 items-center justify-center rounded-full active:scale-95"
                            style={{ backgroundColor: 'hsl(var(--event-on-ink)/0.12)' }}
                        >
                            <ArrowLeft className="h-5 w-5" style={{ color: 'hsl(var(--event-on-ink))' }} />
                        </button>
                    </div>
                )}
                {poster && (
                    <div className="relative mx-auto max-w-lg">
                        <button
                            type="button"
                            onClick={() => setZoom(true)}
                            aria-label="View full poster"
                            className="block w-full"
                        >
                            <img
                                src={poster}
                                alt={`${event.title} tournament poster`}
                                className="aspect-[4/5] w-full object-cover object-top"
                            />
                        </button>
                        <div
                            className="pointer-events-none absolute inset-0"
                            style={{
                                background:
                                    'linear-gradient(to top, hsl(var(--event-ink)) 4%, hsl(var(--event-ink)/0.1) 30%, transparent 55%)',
                            }}
                        />
                        <button
                            onClick={() => navigate('/events')}
                            aria-label="Back to events"
                            className="absolute left-3 top-3 flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-md active:scale-95"
                            style={{ backgroundColor: 'hsl(var(--event-ink)/0.55)' }}
                        >
                            <ArrowLeft className="h-5 w-5" style={{ color: 'hsl(var(--event-on-ink))' }} />
                        </button>
                    </div>
                )}
            </header>

            {zoom && poster && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ backgroundColor: 'hsl(var(--event-ink)/0.96)' }}
                    onClick={() => setZoom(false)}
                    role="dialog"
                    aria-modal="true"
                >
                    <img
                        src={poster}
                        alt={`${event.title} tournament poster, full size`}
                        className="max-h-[86vh] w-auto max-w-full rounded-2xl object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <button
                        onClick={() => setZoom(false)}
                        aria-label="Close poster"
                        className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full backdrop-blur-md active:scale-95"
                        style={{
                            backgroundColor: 'hsl(var(--event-on-ink)/0.14)',
                            color: 'hsl(var(--event-on-ink))',
                        }}
                    >
                        <X className="h-6 w-6" />
                    </button>
                    <button
                        onClick={() => setZoom(false)}
                        className="absolute inset-x-0 bottom-6 mx-auto w-40 rounded-full py-3 text-sm font-bold"
                        style={{
                            backgroundColor: 'hsl(var(--event-accent))',
                            color: 'hsl(var(--event-accent-foreground))',
                        }}
                    >
                        Close
                    </button>
                </div>
            )}

            <main className="relative z-10 mx-auto max-w-lg px-4 pt-2">
                <h1
                    className="pb-1 text-[22px] font-black uppercase leading-[1.25] tracking-tight"
                    style={{ color: 'hsl(var(--event-on-ink))' }}
                >
                    {event.title}
                </h1>
                {event.hosts.length > 0 && (
                    <p className="text-[13px]" style={{ color: 'hsl(var(--event-on-ink-muted))' }}>
                        Hosted by{' '}
                        <Link
                            to={`/events/${event.slug}/hosts`}
                            className="font-semibold underline underline-offset-2 decoration-white/30"
                            style={{ color: 'hsl(var(--event-on-ink)/0.88)' }}
                        >
                            {event.hosts[0].name}
                        </Link>
                    </p>
                )}

                <div className="mt-3">
                    <p
                        className="text-[15px] font-semibold"
                        style={{ color: 'hsl(var(--event-on-ink))' }}
                    >
                        {format(event.start, 'EEE d MMM')} · {format(event.start, 'h:mm a')} –{' '}
                        {format(event.end, 'h:mm a')}
                    </p>
                    {event.phase === 'upcoming' && <MiniCountdown target={event.start} />}
                    {event.phase === 'live' && (
                        <div
                            className="mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide"
                            style={{
                                backgroundColor: 'hsl(var(--event-accent))',
                                color: 'hsl(var(--event-accent-foreground))',
                            }}
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-70" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
                            </span>
                            Live now
                        </div>
                    )}
                    {event.phase === 'completed' && (
                        <p className="mt-2 text-xs" style={{ color: 'hsl(var(--event-on-ink-muted))' }}>
                            Finished
                        </p>
                    )}
                </div>

                {reg && (
                    <div
                        className="mt-4 flex items-center gap-2.5 rounded-2xl px-4 py-3.5"
                        style={{ backgroundColor: 'hsl(var(--event-open)/0.15)' }}
                    >
                        <CheckCircle2
                            className="h-5 w-5 shrink-0"
                            style={{ color: 'hsl(var(--event-open))' }}
                        />
                        <p className="text-sm font-semibold" style={{ color: 'hsl(var(--event-on-ink))' }}>
                            You're in · pass {reg.ticketCode}
                        </p>
                    </div>
                )}

                <nav className="mt-4 grid grid-cols-2 gap-2.5">
                    {topTiles.map((t) => {
                        const inner = (
                            <>
                                <t.icon className="h-5 w-5 shrink-0" style={{ color: 'hsl(var(--event-lime))' }} />
                                <div className="min-w-0 flex-1">
                                    <p
                                        className="truncate text-[14px] font-semibold leading-tight"
                                        style={{ color: 'hsl(var(--event-on-ink))' }}
                                    >
                                        {t.label}
                                    </p>
                                    <p
                                        className="truncate text-[11px] leading-tight"
                                        style={{ color: 'hsl(var(--event-on-ink-muted))' }}
                                    >
                                        {t.hint}
                                    </p>
                                </div>
                                <ChevronRight
                                    className="h-4 w-4 shrink-0"
                                    style={{ color: 'hsl(var(--event-on-ink-muted))' }}
                                />
                            </>
                        );
                        const cls =
                            'flex items-center gap-2.5 rounded-2xl px-3 py-3.5 active:scale-[0.99]';
                        const style = { backgroundColor: 'hsl(var(--event-ink-soft))' };
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
                </nav>

                <Link
                    to={`/events/${event.slug}/players`}
                    className="mt-2.5 block rounded-2xl px-4 py-4 active:scale-[0.99]"
                    style={{ backgroundColor: 'hsl(var(--event-ink-soft))' }}
                >
                    <div className="flex items-center gap-2.5">
                        <Users className="h-5 w-5 shrink-0" style={{ color: 'hsl(var(--event-lime))' }} />
                        <div className="min-w-0 flex-1">
                            <p
                                className="truncate text-[14px] font-semibold leading-tight"
                                style={{ color: 'hsl(var(--event-on-ink))' }}
                            >
                                Players
                            </p>
                        </div>
                        <span className="flex shrink-0 items-center gap-1.5">
                            <span
                                className="text-[11px] font-bold uppercase tracking-wide"
                                style={{ color: statusColor }}
                            >
                                {fill.label}
                            </span>
                            <span
                                className="block h-1 w-10 overflow-hidden rounded-full"
                                style={{ backgroundColor: 'hsl(var(--event-on-ink)/0.12)' }}
                            >
                                <span
                                    className="block h-full rounded-full transition-all"
                                    style={{ width: `${barPct}%`, backgroundColor: statusColor }}
                                />
                            </span>
                        </span>
                        <ChevronRight
                            className="h-4 w-4 shrink-0"
                            style={{ color: 'hsl(var(--event-on-ink-muted))' }}
                        />
                    </div>
                </Link>

                {cohorts.length > 1 && (
                    <section className="mt-6">
                        <p
                            className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                            style={{ color: 'hsl(var(--event-on-ink-muted))' }}
                        >
                            Cohorts
                        </p>
                        <p className="mb-2 px-1 text-[12px]" style={{ color: 'hsl(var(--event-on-ink-muted))' }}>
                            Beginner and Intermediate play separate tournaments — you only face
                            players in your own cohort.
                        </p>
                        <div className="space-y-2">
                            {cohorts.map((c) => {
                                const st = cohortStatus(event, c);
                                return (
                                    <Link
                                        key={c}
                                        to={`/events/${event.slug}/players?cohort=${c}`}
                                        className="flex items-center gap-2.5 rounded-2xl px-4 py-3.5 active:scale-[0.99]"
                                        style={{ backgroundColor: 'hsl(var(--event-ink-soft))' }}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p
                                                className="truncate text-[14px] font-semibold leading-tight"
                                                style={{ color: 'hsl(var(--event-on-ink))' }}
                                            >
                                                {c}
                                            </p>
                                            <p className="truncate text-[11px] leading-tight" style={{ color: 'hsl(var(--event-on-ink-muted))' }}>
                                                {rosterIn(event, c).length} registered
                                            </p>
                                        </div>
                                        <span
                                            className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em]"
                                            style={
                                                st === 'live'
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
                                            {st === 'live' ? 'Live' : st === 'completed' ? 'Finished' : 'Not started'}
                                        </span>
                                        <ChevronRight
                                            className="h-4 w-4 shrink-0"
                                            style={{ color: 'hsl(var(--event-on-ink-muted))' }}
                                        />
                                    </Link>
                                );
                            })}
                        </div>
                    </section>
                )}

                <section className="mt-6">
                    <div className="mb-2 flex items-center justify-between px-1">
                        <p
                            className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                            style={{ color: 'hsl(var(--event-on-ink-muted))' }}
                        >
                            Standings
                        </p>
                        <Link
                            to={`/events/${event.slug}/standings`}
                            className="flex items-center gap-0.5 text-[11px] font-semibold"
                            style={{ color: 'hsl(var(--event-on-ink-muted))' }}
                        >
                            See all
                            <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                    <Link
                        to={`/events/${event.slug}/standings`}
                        className="relative block overflow-hidden rounded-2xl active:scale-[0.99]"
                        style={{ backgroundColor: 'hsl(var(--event-ink-soft))' }}
                    >
                        {event.phase === 'upcoming' ? (
                            <>
                                <div className="pointer-events-none select-none space-y-2 p-4 blur-[5px]" aria-hidden>
                                    {[1, 2, 3].map((n) => (
                                        <div key={n} className="flex items-center gap-3">
                                            <span
                                                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                                                style={{
                                                    backgroundColor: 'hsl(var(--event-lime)/0.2)',
                                                    color: 'hsl(var(--event-lime))',
                                                }}
                                            >
                                                {n}
                                            </span>
                                            <span
                                                className="h-3 flex-1 rounded-full"
                                                style={{ backgroundColor: 'hsl(var(--event-on-ink)/0.18)' }}
                                            />
                                            <span
                                                className="h-3 w-10 rounded-full"
                                                style={{ backgroundColor: 'hsl(var(--event-on-ink)/0.18)' }}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                                    <Trophy className="h-6 w-6" style={{ color: 'hsl(var(--event-lime))' }} />
                                    <p
                                        className="mt-2 text-sm font-semibold"
                                        style={{ color: 'hsl(var(--event-on-ink))' }}
                                    >
                                        Come back at the start of the event to see the standings.
                                    </p>
                                </div>
                            </>
                        ) : standingsPreview.length > 0 ? (
                            <div className="space-y-2 p-4">
                                {standingsPreview.map((row) => (
                                    <div key={row.playerId} className="flex items-center gap-3">
                                        <span
                                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                                            style={{
                                                backgroundColor: 'hsl(var(--event-lime)/0.2)',
                                                color: 'hsl(var(--event-lime))',
                                            }}
                                        >
                                            {row.rank}
                                        </span>
                                        <span
                                            className="min-w-0 flex-1 truncate text-[14px] font-medium"
                                            style={{ color: 'hsl(var(--event-on-ink))' }}
                                        >
                                            {row.name}
                                        </span>
                                        <span
                                            className="text-[14px] font-bold tabular-nums"
                                            style={{ color: 'hsl(var(--event-on-ink))' }}
                                        >
                                            {row.points}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-1.5 px-6 py-8 text-center">
                                <Trophy className="h-6 w-6" style={{ color: 'hsl(var(--event-lime))' }} />
                                <p
                                    className="text-sm font-semibold"
                                    style={{ color: 'hsl(var(--event-on-ink))' }}
                                >
                                    No standings yet
                                </p>
                                <p className="text-xs" style={{ color: 'hsl(var(--event-on-ink-muted))' }}>
                                    Check back once the first round is scored.
                                </p>
                            </div>
                        )}
                    </Link>
                </section>
            </main>

            <div
                className="fixed inset-x-0 bottom-0 z-20 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
                style={{
                    backgroundColor: 'hsl(var(--event-ink)/0.92)',
                    borderTop: '1px solid hsl(var(--event-on-ink)/0.1)',
                }}
            >
                <div className="mx-auto flex max-w-lg items-center gap-4 px-4 py-3">
                    <div className="min-w-0 shrink-0">
                        <p
                            className="text-[11px] uppercase tracking-wider"
                            style={{ color: 'hsl(var(--event-on-ink-muted))' }}
                        >
                            Entry
                        </p>
                        <p
                            className="text-xl font-black leading-tight"
                            style={{ color: 'hsl(var(--event-on-ink))' }}
                        >
                            ₹{event.priceInr.toLocaleString('en-IN')}
                        </p>
                    </div>
                    {reg ? (
                        <Link
                            to={`/events/${event.slug}/pass`}
                            className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl text-[16px] font-bold"
                            style={{
                                backgroundColor: 'hsl(var(--event-ink-soft))',
                                color: 'hsl(var(--event-on-ink))',
                            }}
                        >
                            <Ticket className="h-4 w-4" /> My pass
                        </Link>
                    ) : event.phase === 'upcoming' ? (
                        <Link
                            to={`/events/${event.slug}/register`}
                            className="inline-flex h-14 flex-1 items-center justify-center rounded-2xl text-[16px] font-black uppercase tracking-wide active:scale-[0.99]"
                            style={{
                                backgroundColor: 'hsl(var(--event-accent))',
                                color: 'hsl(var(--event-accent-foreground))',
                            }}
                        >
                            {fill.status === 'full' ? 'Join waitlist' : 'Register'}
                        </Link>
                    ) : (
                        <Link
                            to={`/events/${event.slug}/live`}
                            className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl text-[16px] font-black uppercase tracking-wide active:scale-[0.99]"
                            style={{
                                backgroundColor: 'hsl(var(--event-accent))',
                                color: 'hsl(var(--event-accent-foreground))',
                            }}
                        >
                            <Trophy className="h-4 w-4" />
                            {event.phase === 'live' ? 'Live scoring' : 'View results'}
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
