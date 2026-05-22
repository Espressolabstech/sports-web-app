import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Construction } from 'lucide-react';
import { CreditHeader } from './CreditHeader';

const SPORT_DISPLAY: Record<string, string> = {
    TENNIS: 'Tennis',
    FOOTBALL: 'Football',
    BADMINTON: 'Badminton',
    TABLE_TENNIS: 'Table Tennis',
    SQUASH: 'Squash',
    RIFLE_SHOOTING: 'Rifle Shooting',
    BOX_CRICKET: 'Box Cricket',
};

export default function ClubComingSoon() {
    const { venueId, sport } = useParams();
    const sportName = SPORT_DISPLAY[sport ?? ''] ?? sport ?? 'This sport';

    return (
        <div>
            <CreditHeader />
            <main className="mx-auto max-w-2xl px-6 py-16 text-center">
                <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--club-accent))]/10 text-[hsl(var(--club-accent))]">
                    <Construction className="h-7 w-7" />
                </div>
                <h1 className="font-serif text-3xl font-semibold">{sportName}</h1>
                <p className="mt-2 text-sm text-[hsl(var(--club-muted))]">
                    Booking for this sport is being set up. Check back soon.
                </p>
                <Link
                    to={`/club/${venueId}`}
                    className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-[hsl(var(--club-accent))] hover:underline"
                >
                    <ArrowLeft className="h-4 w-4" /> Back to club
                </Link>
            </main>
        </div>
    );
}
