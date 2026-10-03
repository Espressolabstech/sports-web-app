import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import HostLiveView from './host-ui/HostLiveView';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import {
    fetchEvent,
    fetchStandings,
    tournamentStatus,
} from '../../lib/public-events';
import { AnimatedLoader } from '../../components/AnimatedLoader';

const ink = { backgroundColor: 'hsl(var(--event-ink))' };
const onInk = { color: 'hsl(var(--event-on-ink))' };
const onInkMuted = { color: 'hsl(var(--event-on-ink-muted))' };

export default function EventLive() {
    const { slug } = useParams();
    const navigate = useNavigate();

    const {
        data: event,
        isLoading,
    } = useQuery({
        queryKey: ['public-event', slug],
        queryFn: () => fetchEvent(slug!),
        enabled: !!slug,
        refetchInterval: (query) => (query.state.data?.phase === 'live' ? 15000 : false),
    });

    const { data: table = [] } = useQuery({
        queryKey: ['public-event-standings', slug],
        queryFn: () => fetchStandings(slug!),
        enabled: !!slug && event?.phase !== 'upcoming',
        refetchInterval: () => (event?.phase === 'live' ? 15000 : false),
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

    const status = tournamentStatus(event);

    return (
        <div className="min-h-screen pb-10" style={ink}>
            <header className="mx-auto max-w-lg px-4 pt-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(`/events/${event.slug}`)}
                        aria-label="Back"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: 'hsl(var(--event-on-ink)/0.08)' }}
                    >
                        <ArrowLeft className="h-5 w-5" style={onInk} />
                    </button>
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] uppercase tracking-[0.18em]" style={onInkMuted}>
                            Live scoring
                        </p>
                        <h1 className="truncate text-[18px] font-bold" style={onInk}>
                            {event.title}
                        </h1>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-lg space-y-4 px-4 pt-4">
                <HostLiveView event={event} table={table} />

                <p className="flex items-center justify-center gap-1.5 px-1 pt-2 pb-6 text-center text-xs" style={onInkMuted}>
                    <RefreshCw className="h-3 w-3" />
                    {status === 'live'
                        ? 'Pull down or tap refresh to see the latest scores.'
                        : status === 'completed'
                          ? 'These are the final results.'
                          : 'Check back once the tournament starts.'}
                </p>
            </main>
        </div>
    );
}
