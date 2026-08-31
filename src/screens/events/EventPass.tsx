import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
    ArrowLeft,
    CheckCircle2,
    ChevronRight,
    Clock,
    MapPin,
    Share2,
    Trophy,
    Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../utils/twMerge';
import { useCountdown } from '../../components/events/Countdown';
import {
    fetchEvent,
    fillStatus,
    getRegistration,
    type EventRegistration,
} from '../../lib/public-events';

const ink = { backgroundColor: 'hsl(var(--event-ink))' };
const card = { backgroundColor: 'hsl(var(--event-ink-soft))' };
const onInk = { color: 'hsl(var(--event-on-ink))' };
const onInkMuted = { color: 'hsl(var(--event-on-ink-muted))' };

function MiniCountdown({ target }: { target: Date }) {
    const t = useCountdown(target);
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
        <p className="mt-1 text-[13px] font-medium tabular-nums" style={onInkMuted}>
            Starts in{' '}
            <span style={{ color: 'hsl(var(--event-accent))' }}>
                {t.days > 0 ? `${t.days}d ` : ''}
                {pad(t.hours)}h {pad(t.minutes)}m {pad(t.seconds)}s
            </span>
        </p>
    );
}

export default function EventPass() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [reg, setReg] = useState<EventRegistration | null>(null);

    const { data: event } = useQuery({
        queryKey: ['public-event', slug],
        queryFn: () => fetchEvent(slug!),
        enabled: !!slug,
    });

    useEffect(() => {
        if (!slug) return;
        const r = getRegistration(slug);
        if (!r) navigate(`/events/${slug}`, { replace: true });
        // eslint-disable-next-line react-hooks/set-state-in-effect
        else setReg(r);
    }, [slug, navigate]);

    if (!event || !reg) return null;

    const fill = fillStatus(event);
    const statusColor =
        fill.status === 'full'
            ? 'hsl(var(--event-full))'
            : fill.status === 'filling'
              ? 'hsl(var(--event-filling))'
              : 'hsl(var(--event-open))';
    const barPct = fill.status === 'full' ? 100 : fill.status === 'filling' ? 70 : 20;

    const share = async () => {
        const url = `${window.location.origin}/events/${event.slug}`;
        const text = `I'm playing ${event.title} at ${event.venueName} on ${format(event.start, 'd MMM')}. Come play with me.`;
        try {
            if (navigator.share) await navigator.share({ title: event.title, text, url });
            else {
                await navigator.clipboard.writeText(`${text} ${url}`);
                toast.success('Link copied');
            }
        } catch {
            /* dismissed */
        }
    };

    return (
        <div className="min-h-screen pb-16" style={ink}>
            <header className="mx-auto max-w-lg px-4 pt-4">
                <button
                    onClick={() => navigate(`/events/${event.slug}`)}
                    aria-label="Back to event"
                    className="flex h-11 w-11 items-center justify-center rounded-full active:scale-95"
                    style={card}
                >
                    <ArrowLeft className="h-5 w-5" style={onInk} />
                </button>

                <div
                    className="mt-4 flex items-center gap-2.5 rounded-2xl px-4 py-3.5"
                    style={{ backgroundColor: 'hsl(var(--event-open)/0.15)' }}
                >
                    <CheckCircle2
                        className="h-5 w-5 shrink-0"
                        style={{ color: 'hsl(var(--event-open))' }}
                    />
                    <p className="text-sm font-semibold" style={onInk}>
                        You're in — see you on court
                    </p>
                </div>

                <h1
                    className="mt-4 pb-1 text-[22px] font-black uppercase leading-[1.25] tracking-tight"
                    style={onInk}
                >
                    {event.title}
                </h1>
                <p className="text-[15px] font-semibold" style={onInk}>
                    {format(event.start, 'EEE d MMM')} · {format(event.start, 'h:mm a')} –{' '}
                    {format(event.end, 'h:mm a')}
                </p>
                {event.phase === 'upcoming' && <MiniCountdown target={event.start} />}
            </header>

            <main className="mx-auto max-w-lg space-y-2.5 px-4 pt-5">
                <section className="overflow-hidden rounded-2xl" style={card}>
                    <div className="space-y-2.5 p-5 text-sm">
                        <p className="flex items-center gap-2" style={onInk}>
                            <Clock className="h-4 w-4 shrink-0" style={{ color: 'hsl(var(--event-lime))' }} />
                            Check in 15 minutes before start
                        </p>
                        <p className="flex items-center gap-2" style={onInk}>
                            <MapPin className="h-4 w-4 shrink-0" style={{ color: 'hsl(var(--event-lime))' }} />
                            {event.venueName}, {event.venueLocation}
                        </p>
                        <p className="flex items-center gap-2" style={onInk}>
                            <Users className="h-4 w-4 shrink-0" style={{ color: 'hsl(var(--event-lime))' }} />
                            {event.capacity} players · {event.courts} courts
                        </p>
                        <p className="text-xs" style={onInkMuted}>
                            Pass code: <span style={onInk}>{reg.ticketCode}</span>
                            {reg.waitlisted && " · Waitlisted — we'll message you if a spot opens"}
                        </p>
                    </div>
                </section>

                <button
                    onClick={share}
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-bold active:scale-[0.99]"
                    style={{ ...card, ...onInk }}
                >
                    <Share2 className="h-4 w-4" /> Invite a friend
                </button>

                <Link
                    to={`/events/${event.slug}/players`}
                    className="mt-2.5 block rounded-2xl px-4 py-4 active:scale-[0.99]"
                    style={card}
                >
                    <div className="flex items-center gap-2.5">
                        <Users className="h-5 w-5 shrink-0" style={{ color: 'hsl(var(--event-lime))' }} />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] font-semibold leading-tight" style={onInk}>
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
                        <ChevronRight className="h-4 w-4 shrink-0" style={onInkMuted} />
                    </div>
                </Link>

                <section className="mt-6">
                    <p
                        className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                        style={onInkMuted}
                    >
                        Standings
                    </p>
                    <Link
                        to={`/events/${event.slug}/standings`}
                        className="relative block overflow-hidden rounded-2xl active:scale-[0.99]"
                        style={card}
                    >
                        <div
                            className={cn(
                                'space-y-2 p-4',
                                event.phase === 'upcoming' && 'pointer-events-none select-none blur-[5px]',
                            )}
                            aria-hidden={event.phase === 'upcoming'}
                        >
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
                        {event.phase === 'upcoming' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                                <Trophy className="h-6 w-6" style={{ color: 'hsl(var(--event-lime))' }} />
                                <p className="mt-2 text-sm font-semibold" style={onInk}>
                                    Come back at the start of the event to see the standings.
                                </p>
                            </div>
                        )}
                    </Link>
                </section>

                <div className="rounded-2xl p-4" style={card}>
                    <h2 className="text-sm font-semibold" style={onInk}>
                        Before you arrive
                    </h2>
                    <ul className="mt-2 space-y-1.5 text-xs leading-relaxed" style={onInkMuted}>
                        <li>· Bring your own racquet if you have one — loaners are available at the desk.</li>
                        <li>· Round one starts sharp; late arrivals miss it and it can't be replayed.</li>
                    </ul>
                </div>
            </main>
        </div>
    );
}
