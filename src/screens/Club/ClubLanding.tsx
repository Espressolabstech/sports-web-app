import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, MapPin, Phone, Mail } from 'lucide-react';
import { CreditHeader } from './CreditHeader';
import { useClub } from './ClubContext';
import { getVenueDetail } from '../../api/adapters/venues';
import { nextDays } from './mock-club';

const SPORT_DISPLAY: Record<string, { name: string; emoji: string }> = {
    TENNIS: { name: 'Tennis', emoji: '🎾' },
    PADEL: { name: 'Padel', emoji: '🎾' },
    PICKLEBALL: { name: 'Pickleball', emoji: '🏓' },
    BADMINTON: { name: 'Badminton', emoji: '🏸' },
    TABLE_TENNIS: { name: 'Table Tennis', emoji: '🏓' },
    SQUASH: { name: 'Squash', emoji: '🏸' },
    FOOTBALL: { name: 'Football', emoji: '⚽' },
    CRICKET: { name: 'Cricket', emoji: '🏏' },
    BOX_CRICKET: { name: 'Box Cricket', emoji: '🏏' },
    BASKETBALL: { name: 'Basketball', emoji: '🏀' },
    VOLLEYBALL: { name: 'Volleyball', emoji: '🏐' },
    SWIMMING: { name: 'Swimming', emoji: '🏊' },
    HOCKEY: { name: 'Hockey', emoji: '🏑' },
    GOLF: { name: 'Golf', emoji: '⛳' },
    CYCLING: { name: 'Cycling', emoji: '🚴' },
    YOGA: { name: 'Yoga', emoji: '🧘' },
    GYM: { name: 'Gym', emoji: '🏋️' },
    RIFLE_SHOOTING: { name: 'Rifle Shooting', emoji: '🎯' },
    ARCHERY: { name: 'Archery', emoji: '🏹' },
    BOXING: { name: 'Boxing', emoji: '🥊' },
    SNOOKER: { name: 'Snooker', emoji: '🎱' },
};

function SportTile({
    sportKey,
    courts,
    onClick,
}: {
    sportKey: string;
    courts: ApiCourt[];
    onClick: () => void;
}) {
    const display = SPORT_DISPLAY[sportKey] ?? { name: sportKey, emoji: '🏅' };
    return (
        <button
            onClick={onClick}
            className="group relative flex h-full w-full flex-col items-start gap-5 rounded-2xl border border-[hsl(var(--club-border))] bg-[hsl(var(--club-surface))] p-5 text-left transition-all hover:-translate-y-0.5 hover:border-[hsl(var(--club-accent))]/40 hover:shadow-[0_8px_30px_-12px_hsl(var(--club-accent)/0.2)]"
        >
            <span className="text-3xl leading-none">{display.emoji}</span>
            <div className="flex-1">
                <h3 className="text-lg font-semibold leading-tight text-[hsl(var(--club-ink))]">
                    {display.name}
                </h3>
                <p className="mt-0.5 text-[11px] text-[hsl(var(--club-muted))]">
                    {courts.length} {courts.length === 1 ? 'court' : 'courts'}
                </p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-[0.14em] text-[hsl(var(--club-muted))] transition-colors group-hover:text-[hsl(var(--club-accent))]">
                Book
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
        </button>
    );
}

export default function ClubLanding() {
    const navigate = useNavigate();
    const { venueId: slugOrId } = useParams();
    useClub();

    const { data } = useQuery({
        queryKey: ['venue', slugOrId],
        queryFn: () => getVenueDetail(slugOrId!),
        enabled: !!slugOrId,
    });

    const venue = data?.data?.venue;
    const courtsBySport = data?.data?.courtsBySport ?? {};
    const sportKeys = Object.keys(courtsBySport);
    const heroImage = venue?.venueImages?.[0]?.url ?? '';
    const todayHours = (() => {
        const day = new Date().getDay();
        return venue?.venueHours?.find((h) => h.dayOfWeek === day);
    })();
    const todayLabel = nextDays(1)[0];

    return (
        <div className="club-root">
            {/* Hero */}
            <header className="relative overflow-hidden">
                {heroImage ? (
                    <div
                        className="aspect-[21/9] w-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${heroImage})` }}
                    />
                ) : (
                    <div className="aspect-[21/9] w-full bg-[hsl(var(--club-accent))]/20" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />
                <div className="absolute inset-0 flex flex-col justify-end px-6 pb-7">
                    <div className="mx-auto w-full max-w-3xl">
                        <h1 className="font-serif text-3xl font-semibold leading-tight text-white sm:text-5xl">
                            {venue?.name ?? ''}
                        </h1>
                        <p className="mt-1 text-sm text-white/70 sm:text-base">
                            {venue?.description ?? 'Member-only sport booking'}
                        </p>
                    </div>
                </div>
            </header>

            <CreditHeader />

            <main className="mx-auto max-w-3xl px-5 pb-16 pt-6">
                <div className="mb-3 flex items-baseline justify-between">
                    <h2 className="font-serif text-2xl font-semibold text-[hsl(var(--club-ink))]">
                        Pick a sport
                    </h2>
                    {sportKeys.length > 0 && (
                        <span className="text-xs text-[hsl(var(--club-muted))]">
                            {sportKeys.length} available
                        </span>
                    )}
                </div>

                {sportKeys.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {sportKeys.map((key) => (
                            <SportTile
                                key={key}
                                sportKey={key}
                                courts={courtsBySport[key]}
                                onClick={() =>
                                    navigate(`/club/${slugOrId}/book/${key}`)
                                }
                            />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {[...Array(4)].map((_, i) => (
                            <div
                                key={i}
                                className="h-36 animate-pulse rounded-2xl bg-[hsl(var(--club-border))]"
                            />
                        ))}
                    </div>
                )}

                {/* Subdued sections */}
                <div className="mt-10 space-y-2">
                    {todayHours && !todayHours.isClosed && (
                        <details className="group rounded-xl border border-[hsl(var(--club-border))] bg-[hsl(var(--club-surface))] px-4">
                            <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-sm font-medium">
                                Hours & access
                                <ChevronRight className="h-4 w-4 text-[hsl(var(--club-muted))] transition-transform group-open:rotate-90" />
                            </summary>
                            <div className="space-y-2 pb-4 text-sm text-[hsl(var(--club-muted))]">
                                <div className="flex justify-between">
                                    <span>Today ({todayLabel.label})</span>
                                    <span className="font-medium text-[hsl(var(--club-ink))]">
                                        {todayHours.openTime}–{todayHours.closeTime}
                                    </span>
                                </div>
                            </div>
                        </details>
                    )}

                    <details className="group rounded-xl border border-[hsl(var(--club-border))] bg-[hsl(var(--club-surface))] px-4">
                        <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-sm font-medium">
                            About · Amenities · Contact
                            <ChevronRight className="h-4 w-4 text-[hsl(var(--club-muted))] transition-transform group-open:rotate-90" />
                        </summary>
                        <div className="space-y-4 pb-4 text-sm text-[hsl(var(--club-muted))]">
                            {venue?.description && (
                                <p className="leading-relaxed">
                                    {venue.description}
                                </p>
                            )}
                            {venue?.venueAmenities &&
                                venue.venueAmenities.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {venue.venueAmenities.map((a) => (
                                            <span
                                                key={a.name}
                                                className="rounded-full border border-[hsl(var(--club-border))] bg-[hsl(var(--club-bg))] px-2.5 py-0.5 text-xs"
                                            >
                                                {a.name}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            <div className="space-y-1.5 text-xs">
                                {venue?.address && (
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-3.5 w-3.5" />
                                        {venue.address}
                                        {venue.city ? `, ${venue.city}` : ''}
                                    </div>
                                )}
                                {venue?.phone && (
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-3.5 w-3.5" />
                                        {venue.phone}
                                    </div>
                                )}
                                {venue?.email && (
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-3.5 w-3.5" />
                                        {venue.email}
                                    </div>
                                )}
                            </div>
                        </div>
                    </details>
                </div>
            </main>
        </div>
    );
}
