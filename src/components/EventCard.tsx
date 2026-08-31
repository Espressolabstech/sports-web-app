import { CalendarDays, MapPin, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { getSportLabel } from '../utils/sports';

const PHASE_LABEL: Record<string, string> = {
    PUBLISHED: 'Upcoming',
    LIVE: 'Live',
    COMPLETED: 'Finished',
};

export function EventCard({ event }: { event: ApiEvent }) {
    const navigate = useNavigate();
    const start = new Date(`${String(event.eventDate).slice(0, 10)}T${event.time}:00`);
    const filled = event.entrants.length;

    return (
        <button
            onClick={() => navigate(`/events/${event.slug}`)}
            className="group block w-full overflow-hidden rounded-2xl border bg-card text-left transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md"
        >
            {event.posterUrl ? (
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
                    <img
                        src={event.posterUrl}
                        alt={event.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        loading="lazy"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                    <span className="absolute left-3 top-3 rounded-full bg-background/85 px-2.5 py-0.5 text-[11px] font-medium text-foreground backdrop-blur-sm">
                        {PHASE_LABEL[event.phase] ?? event.phase}
                    </span>
                </div>
            ) : null}
            <div className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                    {!event.posterUrl && (
                        <span className="mb-1 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {PHASE_LABEL[event.phase] ?? event.phase}
                        </span>
                    )}
                    <h3 className="truncate text-[15px] font-semibold tracking-tight text-foreground">
                        {event.title}
                    </h3>
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                            {format(start, 'EEE d MMM · h:mm a')}
                        </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{event.venueName}</span>
                    </div>
                </div>
                <div className="shrink-0 text-right">
                    <p className="text-xs font-medium text-foreground">
                        {getSportLabel(event.sport)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                        {filled}/{event.capacity}
                    </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
            </div>
        </button>
    );
}
