import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Clock } from 'lucide-react';
import { CreditHeader } from './CreditHeader';
import { useClub, remainingCredits } from './ClubContext';
import { toast } from 'sonner';

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

export default function ClubConfirm() {
    const { venueId, sport: sportKey } = useParams();
    const navigate = useNavigate();
    const { pending, member, confirmBooking } = useClub();
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!pending)
            navigate(`/club/${venueId}/book/${sportKey}`, { replace: true });
    }, [pending, navigate, venueId, sportKey]);

    if (!pending) return null;

    const sportName = SPORT_DISPLAY[sportKey ?? ''] ?? sportKey ?? '';
    const remaining = remainingCredits(member);
    const after = remaining - pending.totalCredits;
    const insufficient = after < 0;
    const start = pending.slots[0].startTime;
    const end = pending.slots[pending.slots.length - 1].endTime;
    const courtName = pending.slots[0].courtName;
    const dateLabel = new Date(pending.date).toLocaleDateString('en', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });

    async function submit() {
        if (insufficient || submitting) return;
        setSubmitting(true);
        try {
            const b = await confirmBooking();
            if (b) navigate(`/club/${venueId}/book/${sportKey}/success`);
        } catch {
            toast.error('Booking failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="pb-16">
            <div className="sticky top-0 z-40 border-b border-[hsl(var(--club-border))] bg-[hsl(var(--club-surface))]/95 backdrop-blur">
                <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-3">
                    <Link
                        to={`/club/${venueId}/book/${sportKey}`}
                        className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[hsl(var(--club-bg))]"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <h1 className="font-serif text-xl font-semibold">
                        Review & confirm
                    </h1>
                </div>
            </div>
            <CreditHeader compact />

            <main className="mx-auto max-w-2xl px-5 pt-6">
                <div className="overflow-hidden rounded-2xl border border-[hsl(var(--club-border))] bg-[hsl(var(--club-surface))]">
                    <div className="border-b border-[hsl(var(--club-border))] px-5 py-4">
                        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-[hsl(var(--club-muted))]">
                            {sportName}
                        </div>
                        <h2 className="mt-1 font-serif text-2xl font-semibold">
                            {start} – {end}
                        </h2>
                        <p className="mt-0.5 text-sm text-[hsl(var(--club-muted))]">
                            {pending.slots.length * 30} minutes ·{' '}
                            {pending.slots.length} × 30-min slots
                        </p>
                    </div>
                    <ul className="divide-y divide-[hsl(var(--club-border))] text-sm">
                        <li className="flex items-center gap-3 px-5 py-3">
                            <Calendar className="h-4 w-4 text-[hsl(var(--club-muted))]" />
                            <span className="flex-1">{dateLabel}</span>
                        </li>
                        <li className="flex items-center gap-3 px-5 py-3">
                            <MapPin className="h-4 w-4 text-[hsl(var(--club-muted))]" />
                            <span className="flex-1">{courtName}</span>
                        </li>
                        <li className="flex items-center gap-3 px-5 py-3">
                            <Clock className="h-4 w-4 text-[hsl(var(--club-muted))]" />
                            <span className="flex-1">
                                Member rate · peak/off-peak applied
                            </span>
                        </li>
                    </ul>
                    <div className="space-y-1.5 border-t border-[hsl(var(--club-border))] bg-[hsl(var(--club-bg))] px-5 py-4 text-sm">
                        <div className="flex justify-between text-[hsl(var(--club-muted))]">
                            <span>Total cost</span>
                            <span className="tabular-nums">
                                {pending.totalCredits} cr
                            </span>
                        </div>
                        <div className="flex justify-between text-[hsl(var(--club-muted))]">
                            <span>Current balance</span>
                            <span className="tabular-nums">
                                {remaining.toLocaleString()} cr
                            </span>
                        </div>
                        <div className="flex justify-between border-t border-dashed border-[hsl(var(--club-border))] pt-1.5 font-semibold text-[hsl(var(--club-ink))]">
                            <span>After booking</span>
                            <span
                                className={`tabular-nums ${
                                    insufficient ? 'text-destructive' : ''
                                }`}
                            >
                                {after.toLocaleString()} cr
                            </span>
                        </div>
                    </div>
                </div>

                <button
                    disabled={insufficient || submitting}
                    onClick={submit}
                    className="mt-6 w-full rounded-xl bg-[hsl(var(--club-accent))] px-5 py-4 text-base font-semibold text-[hsl(var(--club-accent-foreground))] disabled:opacity-50"
                >
                    {submitting
                        ? 'Confirming…'
                        : insufficient
                          ? 'Not enough credits — refreshes on the 1st'
                          : `Book with ${pending.totalCredits} credits`}
                </button>

                <p className="mt-4 text-center text-[11px] text-[hsl(var(--club-muted))]">
                    Cancellations up to 4 hours before refund credits in full.
                </p>
            </main>
        </div>
    );
}
