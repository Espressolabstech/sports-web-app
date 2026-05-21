import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check, CalendarPlus, Home } from 'lucide-react';
import { useClub, remainingCredits } from './ClubContext';

const SPORT_DISPLAY: Record<string, string> = {
    TENNIS: 'Tennis',
    FOOTBALL: 'Football',
    BADMINTON: 'Badminton',
    TABLE_TENNIS: 'Table Tennis',
    SQUASH: 'Squash',
    RIFLE_SHOOTING: 'Rifle Shooting',
    BOX_CRICKET: 'Box Cricket',
    CRICKET: 'Cricket',
    PADEL: 'Padel',
    PICKLEBALL: 'Pickleball',
};

export default function ClubSuccess() {
    const { venueId, sport: sportKey } = useParams();
    const navigate = useNavigate();
    const { lastBooking, member } = useClub();

    useEffect(() => {
        if (!lastBooking) navigate(`/club/${venueId}`, { replace: true });
    }, [lastBooking, navigate, venueId]);

    if (!lastBooking) return null;

    const sportName = SPORT_DISPLAY[sportKey ?? ''] ?? sportKey ?? '';
    const start = lastBooking.slots[0].startTime;
    const end = lastBooking.slots[lastBooking.slots.length - 1].endTime;
    const courtName = lastBooking.slots[0].courtName;
    const dateLabel = new Date(lastBooking.date).toLocaleDateString('en', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });

    return (
        <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--club-accent))] text-[hsl(var(--club-accent-foreground))]">
                <Check className="h-8 w-8" strokeWidth={3} />
            </div>
            <h1 className="mt-6 font-serif text-3xl font-semibold sm:text-4xl">
                You're booked
            </h1>
            <p className="mt-2 text-[hsl(var(--club-muted))]">
                {sportName} · {courtName}
            </p>

            <div className="mt-8 w-full rounded-2xl border border-[hsl(var(--club-border))] bg-[hsl(var(--club-surface))] p-5 text-left">
                <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-[hsl(var(--club-muted))]">
                    Confirmation · {lastBooking.ref}
                </div>
                <div className="mt-2 font-serif text-2xl font-semibold">
                    {start} – {end}
                </div>
                <div className="mt-1 text-sm text-[hsl(var(--club-muted))]">
                    {dateLabel}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-dashed border-[hsl(var(--club-border))] pt-4 text-sm">
                    <span className="text-[hsl(var(--club-muted))]">
                        Charged
                    </span>
                    <span className="font-semibold tabular-nums">
                        {lastBooking.totalCredits} cr
                    </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-[hsl(var(--club-muted))]">
                        Remaining
                    </span>
                    <span className="font-semibold tabular-nums text-[hsl(var(--club-accent))]">
                        {remainingCredits(member).toLocaleString()} cr
                    </span>
                </div>
            </div>

            <div className="mt-8 grid w-full grid-cols-2 gap-3">
                <button
                    onClick={() => alert('Calendar export coming soon')}
                    className="flex items-center justify-center gap-2 rounded-xl border border-[hsl(var(--club-border))] bg-[hsl(var(--club-surface))] px-4 py-3 text-sm font-medium"
                >
                    <CalendarPlus className="h-4 w-4" /> Add to calendar
                </button>
                <Link
                    to={`/club/${venueId}`}
                    className="flex items-center justify-center gap-2 rounded-xl bg-[hsl(var(--club-ink))] px-4 py-3 text-sm font-medium text-[hsl(var(--club-surface))]"
                >
                    <Home className="h-4 w-4" /> Back to club
                </Link>
            </div>
        </div>
    );
}
