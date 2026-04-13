import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getVenueDetail } from '../../api/adapters/venues';
import { getVenueTier } from '../../api/adapters/tier';
import {
    ArrowLeft,
    Crown,
    ExternalLink,
    MapPin,
    Percent,
    Share2,
    Shield,
    Star,
    Unlock,
    Lock,
    Zap,
    Info,
    ChevronRight,
    Clock,
    RefreshCw,
    Check,
    Sparkles,
    Wallet,
    LogOut,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';
import { PhoneLoginModal } from '../../components/PhoneLoginModal';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '../../components/ui/dialog';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '../../components/ui/sheet';
import { getToken } from '../../utils/cookies.helpers';
import { formatTime } from '../../utils/twMerge';

// ── Tier Metadata ──────────────────────────────────────────────────────────────
const TIER_META: Record<
    string,
    {
        label: string;
        icon: React.ReactNode;
        gradient: string;
        bgGradient: string;
        color: string;
        bgClass: string;
        chipBg: string;
        chipText: string;
    }
> = {
    club: {
        label: 'Club',
        icon: <Shield className="h-5 w-5" />,
        gradient: 'bg-gradient-to-r from-blue-500 to-sky-400',
        bgGradient:
            'bg-gradient-to-br from-blue-50 via-sky-50 to-blue-100 dark:from-blue-950/40 dark:via-sky-950/30 dark:to-blue-900/40',
        color: 'text-blue-600 dark:text-blue-400',
        bgClass: 'bg-blue-500/10',
        chipBg: 'bg-blue-500/15',
        chipText: 'text-blue-700 dark:text-blue-300',
    },
    pro: {
        label: 'Pro',
        icon: <Star className="h-5 w-5" />,
        gradient: 'bg-gradient-to-r from-emerald-500 to-teal-400',
        bgGradient:
            'bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-900/40',
        color: 'text-emerald-600 dark:text-emerald-400',
        bgClass: 'bg-emerald-500/10',
        chipBg: 'bg-emerald-500/15',
        chipText: 'text-emerald-700 dark:text-emerald-300',
    },
    elite: {
        label: 'Elite',
        icon: <Crown className="h-5 w-5" />,
        gradient: 'bg-gradient-to-r from-violet-600 to-fuchsia-400',
        bgGradient:
            'bg-gradient-to-br from-violet-50 via-fuchsia-50 to-violet-100 dark:from-violet-950/40 dark:via-fuchsia-950/30 dark:to-violet-900/40',
        color: 'text-violet-600 dark:text-violet-400',
        bgClass: 'bg-violet-500/10',
        chipBg: 'bg-violet-500/15',
        chipText: 'text-violet-700 dark:text-violet-300',
    },
};

const ALL_PERKS: TierPerkInfo[] = [
    {
        key: 'otc',
        name: 'Open to Cancel',
        icon: <Unlock className="h-3.5 w-3.5" />,
        shortLabel: 'OTC',
        description:
            'Release a confirmed booking. If someone else books that slot, you get a full refund automatically.',
        howItWorks: [
            "Tap 'Open to Cancel' on any upcoming booking.",
            'Your slot becomes available to other players.',
            "If someone books it → you're fully refunded.",
            'If no one books it → you stay confirmed and are charged as normal.',
            'You get 2 OTC uses per month at each venue.',
        ],
    },
    {
        key: 'rental_discount',
        name: '15% off Rentals',
        icon: <Percent className="h-3.5 w-3.5" />,
        shortLabel: 'Rentals',
        description:
            'Get 15% off all ball and paddle/racket rentals at this venue.',
        howItWorks: [
            'Discount applies automatically at checkout.',
            'Covers balls, paddles, and rackets.',
            'Valid for every booking you make at this venue.',
        ],
    },
    {
        key: 'hold',
        name: 'Court on Hold',
        icon: <Lock className="h-3.5 w-3.5" />,
        shortLabel: 'Hold',
        description:
            'Reserve a court for 30 minutes while you decide — no charge unless you confirm.',
        howItWorks: [
            "Pick a slot and tap 'Hold Court'.",
            'The slot is reserved for you for 30 minutes.',
            'Confirm and pay within 30 min to keep it.',
            "If you don't confirm, the hold expires and the slot reopens.",
            'Requires at least 24 hours before the session.',
        ],
    },
    {
        key: 'early',
        name: 'Early Access',
        icon: <Zap className="h-3.5 w-3.5" />,
        shortLabel: 'Early',
        description:
            'Get a 30-minute head start to book slots before they open to everyone else.',
        howItWorks: [
            'New slots appear to you 30 minutes before other players.',
            'Book prime-time slots before they sell out.',
            'Available automatically — no action needed.',
        ],
    },
];

const TIER_PERK_KEYS: Record<string, string[]> = {
    club: ['otc', 'rental_discount'],
    pro: ['otc', 'rental_discount', 'hold'],
    elite: ['otc', 'rental_discount', 'hold', 'early'],
};

const TIER_PERKS: Record<string, TierPerkInfo[]> = Object.fromEntries(
    Object.entries(TIER_PERK_KEYS).map(([tier, keys]) => [
        tier,
        keys.map((k) => ALL_PERKS.find((p) => p.key === k)!),
    ]),
);

// ── Sport SVG Icons ────────────────────────────────────────────────────────────
function PadelIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <ellipse cx="12" cy="9" rx="5.5" ry="7" />
            <line x1="12" y1="16" x2="12" y2="23" />
            <line x1="9" y1="5" x2="9" y2="13" />
            <line x1="15" y1="5" x2="15" y2="13" />
            <line x1="7" y1="9" x2="17" y2="9" />
            <circle cx="12" cy="9" r="1" fill="currentColor" stroke="none" />
        </svg>
    );
}

function PickleballIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect x="6" y="1" width="12" height="14" rx="6" />
            <line x1="12" y1="15" x2="12" y2="23" />
            <circle cx="10" cy="7" r="0.8" fill="currentColor" stroke="none" />
            <circle cx="14" cy="7" r="0.8" fill="currentColor" stroke="none" />
            <circle cx="10" cy="11" r="0.8" fill="currentColor" stroke="none" />
            <circle cx="14" cy="11" r="0.8" fill="currentColor" stroke="none" />
            <circle cx="12" cy="9" r="0.8" fill="currentColor" stroke="none" />
        </svg>
    );
}

const SPORT_ICONS: Record<string, React.ReactNode> = {
    PADEL: <PadelIcon className="h-6 w-6" />,
    PICKELBALL: <PickleballIcon className="h-6 w-6" />,
    Padel: <PadelIcon className="h-6 w-6" />,
    Pickleball: <PickleballIcon className="h-6 w-6" />,
};

const Venues = () => {
    const { venueId } = useParams();
    const navigate = useNavigate();
    const user = !!getToken();
    const [loginOpen, setLoginOpen] = useState(false);
    const [perksSheetOpen, setPerksSheetOpen] = useState(false);
    const [creditsSheetOpen, setCreditsSheetOpen] = useState(false);
    const [perkDetailOpen, setPerkDetailOpen] = useState<TierPerkInfo | null>(
        null,
    );
    const [policiesSheetOpen, setPoliciesSheetOpen] = useState(false);

    const { data: venueData, isLoading: venueLoading } = useQuery({
        queryKey: ['venue', venueId],
        queryFn: () => getVenueDetail(venueId!),
        enabled: !!venueId,
    });

    const { data: tierData } = useQuery({
        queryKey: ['venue-tier', venueId],
        queryFn: () => getVenueTier(venueId!),
        enabled: !!venueId && !!user,
    });

    const facility = venueData?.data?.venue;
    const membership = venueData?.data?.membership;
    const courtsBySport = venueData?.data?.courtsBySport ?? {};
    const allCourts = Object.values(courtsBySport).flat();
    const creditPackages: CreditPackage[] = (venueData?.data?.creditPackages ??
        []) as CreditPackage[];

    const tierConfigs: ApiTierConfig[] = tierData?.data?.tier_configs ?? [];
    const currentTierName = membership?.tier
        ? membership.tier.toLowerCase()
        : null;
    const spendProgress =
        membership?.tierProgress?.spendProgressPct ??
        (currentTierName === 'elite' ? 100 : 0);
    const remainSpend = membership?.tierProgress?.remainingSpend ?? 0;

    const tierOrder = ['club', 'pro', 'elite'];
    const currentTierIndex = currentTierName
        ? tierOrder.indexOf(currentTierName)
        : -1;
    const nextTierName = membership?.tierProgress?.nextTier
        ? membership.tierProgress.nextTier.toLowerCase()
        : currentTierIndex >= 0 && currentTierIndex < 2
          ? tierOrder[currentTierIndex + 1]
          : null;
    const nextLabel = nextTierName ? TIER_META[nextTierName]?.label : null;

    const meta = currentTierName ? TIER_META[currentTierName] : null;
    const perks = currentTierName ? TIER_PERKS[currentTierName] : [];

    // Group courts by sport
    const sportGroups = Object.entries(courtsBySport).map(
        ([sport, sportCourts]) => {
            const minPrice =
                sportCourts.length > 0
                    ? Math.min(
                          ...sportCourts.map(
                              (c) => c.courtPricings[0]?.pricePerSlot ?? 0,
                          ),
                      )
                    : 0;
            return { sport, courtCount: sportCourts.length, minPrice };
        },
    );

    // Hours from API
    const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const venueHours = (facility?.venueHours ?? []).map((h) => ({
        day: DAY_NAMES[h.dayOfWeek],
        time: h.isClosed
            ? 'Closed'
            : `${formatTime(h.openTime)} – ${formatTime(h.closeTime)}`,
    }));
    const cancellationPolicy =
        facility?.bookingPolicy?.cancellationPolicy ?? '';

    if (venueLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center text-muted-foreground">
                Loading venue…
            </div>
        );
    }

    if (!facility) {
        return (
            <div className="flex min-h-screen items-center justify-center text-muted-foreground">
                Venue not found
            </div>
        );
    }

    const handleBookSport = (sport: string) => {
        if (!user) {
            setLoginOpen(true);
        } else {
            const firstCourt = allCourts.find(
                (c: ApiCourt) => c.sport.toLowerCase() === sport.toLowerCase(),
            );
            navigate(
                `/booking/${facility.id}${firstCourt ? `/${firstCourt.id}` : ''}`,
            );
        }
    };

    const handleShare = () => {
        const sports = sportGroups.map((g) => g.sport).join(' & ');
        const mapsLink =
            facility.latitude && facility.longitude
                ? `https://maps.google.com/?q=${facility.latitude},${facility.longitude}`
                : `https://maps.google.com/?q=${encodeURIComponent(`${facility.name} ${facility.city}`)}`;

        const lines = [
            `🏟️ Check out *${facility.name}* on BookEase!`,
            ``,
            `🎾 Sports: ${sports}`,
            `📍 Location: ${facility.city}`,
            `🗺️ Directions: ${mapsLink}`,
            ``,
            `Book a court: ${window.location.href}`,
        ];
        const text = lines.join('\n');

        window.open(
            `https://wa.me/?text=${encodeURIComponent(text)}`,
            '_blank',
            'noopener,noreferrer',
        );
    };

    return (
        <div className="min-h-screen bg-background pb-10">
            {/* ── Hero ── */}
            <div className="relative">
                <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
                    {facility.venueImages.length > 0 && (
                        <img
                            src={facility.venueImages[0].url}
                            alt={facility.name}
                            className="h-full w-full object-cover"
                        />
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
                </div>

                <div className="absolute left-3 top-3">
                    <button
                        onClick={() => navigate('/')}
                        className="rounded-full bg-card/80 p-2 backdrop-blur-sm hover:bg-card transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-foreground" />
                    </button>
                </div>

                <div className="absolute right-3 top-3 flex items-center gap-2">
                    <button
                        onClick={handleShare}
                        className="rounded-full bg-card/80 p-2 backdrop-blur-sm hover:bg-card transition-colors"
                        aria-label="Share venue"
                    >
                        <Share2 className="h-5 w-5 text-foreground" />
                    </button>
                    {user && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="rounded-full bg-card/80 p-2 backdrop-blur-sm hover:bg-card transition-colors">
                                    <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                                        U
                                    </div>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    onClick={() => navigate('/profile')}
                                >
                                    Profile & Bookings
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Sign Out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>

            <div className="mx-auto max-w-lg px-4">
                {/* ── Section 1: Venue Identity ── */}
                <div className="pt-2 pb-5">
                    <div className="flex items-start gap-2">
                        <h1 className="text-2xl font-bold text-foreground flex-1">
                            {facility.name}
                        </h1>
                        {user && currentTierName && meta && (
                            <button
                                onClick={() => setPerksSheetOpen(true)}
                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${meta.chipBg} ${meta.chipText} shrink-0 mt-1 hover:opacity-80 transition-opacity`}
                            >
                                <span className="[&>svg]:h-3 [&>svg]:w-3">
                                    {meta.icon}
                                </span>
                                {meta.label}
                            </button>
                        )}
                    </div>
                    <button className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:underline text-left">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span>{facility.city}</span>
                        <ExternalLink className="h-3 w-3 opacity-60" />
                    </button>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {facility.description}
                    </p>
                </div>

                <Separator className="mb-5" />

                {/* ── Section 2: Book a Court ── */}
                <section className="mb-6">
                    <h2 className="text-lg font-bold text-foreground mb-3">
                        Book a Court
                    </h2>
                    <div className="space-y-2">
                        {sportGroups.map(({ sport, courtCount, minPrice }) => (
                            <button
                                key={sport}
                                className="w-full flex items-center gap-3 rounded-xl border bg-card p-3 hover:shadow-md transition-all text-left group"
                                onClick={() => handleBookSport(sport)}
                            >
                                <div className="text-muted-foreground/60 shrink-0">
                                    {SPORT_ICONS[sport] || (
                                        <Shield className="h-6 w-6" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-foreground text-[15px] leading-tight">
                                        {sport === 'PADEL'
                                            ? 'Padel'
                                            : sport === 'PICKELBALL'
                                              ? 'Pickleball'
                                              : sport}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {courtCount} court
                                        {courtCount !== 1 ? 's' : ''} · From ₹
                                        {minPrice}/hr
                                    </p>
                                </div>
                                <Button
                                    size="default"
                                    className="shrink-0 gap-1.5 px-5 font-semibold shadow-sm group-hover:shadow-md transition-shadow"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleBookSport(sport);
                                    }}
                                >
                                    Book
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </button>
                        ))}
                    </div>
                </section>

                <Separator className="mb-5" />

                {/* ── Section 3: Features & Perks ── */}
                <section className="mb-6">
                    <div className="mb-3">
                        <h2 className="text-lg font-bold text-foreground">
                            Features & Perks
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Play more, unlock more at this venue
                        </p>
                    </div>

                    {(membership?.totalBookings ?? 0) === 0 ? (
                        /* No bookings yet — unlock prompt only */
                        <div className="rounded-2xl bg-card border px-5 py-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="h-5 w-5 text-primary" />
                                <p className="text-base font-bold text-foreground">
                                    Unlock Perks
                                </p>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Make your first booking to start unlocking
                                exclusive perks like flexible cancellations,
                                rental discounts, and early access to slots.
                            </p>
                            <button
                                onClick={() => setPerksSheetOpen(true)}
                                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                            >
                                See all tiers &amp; perks
                                <ChevronRight className="h-3 w-3" />
                            </button>
                        </div>
                    ) : (
                        /* Has bookings — show tier card */
                        <div
                            className={`rounded-2xl overflow-hidden relative ${meta ? meta.bgGradient : 'bg-card border'}`}
                        >
                            {meta && (
                                <>
                                    <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full opacity-[0.07] bg-current" />
                                    <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full opacity-[0.05] bg-current" />
                                </>
                            )}
                            <div className="relative px-5 py-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className={`flex items-center justify-center h-9 w-9 rounded-xl ${meta!.bgClass} ${meta!.color}`}
                                        >
                                            {meta!.icon}
                                        </div>
                                        <p
                                            className={`text-2xl font-extrabold tracking-tight ${meta!.color}`}
                                        >
                                            {meta!.label}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setPerksSheetOpen(true)}
                                        className="text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors mt-1"
                                        aria-label="View all tiers"
                                    >
                                        <Info className="h-4 w-4" />
                                    </button>
                                </div>
                                {currentTierName === 'elite' && (
                                    <p className="text-xs font-medium text-muted-foreground mt-1 ml-11">
                                        Highest tier — all perks unlocked
                                    </p>
                                )}
                                {nextTierName && (
                                    <div className="mt-3">
                                        <div className="h-2 w-full rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${meta!.gradient}`}
                                                style={{
                                                    width: `${spendProgress}%`,
                                                }}
                                            />
                                        </div>
                                        {remainSpend > 0 && (
                                            <p className="text-xs text-muted-foreground mt-2">
                                                Spend ₹
                                                {remainSpend.toLocaleString(
                                                    'en-IN',
                                                )}{' '}
                                                more to upgrade to {nextLabel}
                                            </p>
                                        )}
                                    </div>
                                )}
                                {perks.length > 0 && (
                                    <div className="mt-4">
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
                                            Perks you've unlocked
                                        </p>
                                        <div className="space-y-1.5">
                                            {perks.map((perk) => (
                                                <button
                                                    key={perk.key}
                                                    onClick={() =>
                                                        setPerkDetailOpen(perk)
                                                    }
                                                    className="flex items-center gap-2.5 w-full text-left rounded-xl bg-white/60 dark:bg-white/[0.06] hover:bg-white/80 dark:hover:bg-white/[0.1] px-3 py-2 transition-colors group"
                                                >
                                                    <div
                                                        className={`flex items-center justify-center h-6 w-6 rounded-lg ${meta!.bgClass} ${meta!.color} shrink-0`}
                                                    >
                                                        {perk.icon}
                                                    </div>
                                                    <span className="text-sm font-medium text-foreground flex-1">
                                                        {perk.name}
                                                    </span>
                                                    <Check className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground/70" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Credit Packages row — always visible */}
                    {creditPackages.length > 0 && (
                        <button
                            onClick={() => setCreditsSheetOpen(true)}
                            className="w-full flex items-center justify-between gap-3 rounded-xl border bg-card p-4 hover:bg-accent/50 transition-colors text-left mt-3"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                                    <Wallet className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-foreground">
                                        Credit Packages
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Buy credits &amp; fast-track your tier
                                    </p>
                                </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </button>
                    )}
                </section>

                <Separator className="mb-5" />

                {/* ── Bottom info card: Amenities + Hours + Location + Policies ── */}
                <div className="rounded-2xl border bg-card overflow-hidden mb-6">
                    {/* Amenities */}
                    <div className="p-4 pb-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                            Amenities
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {facility.venueAmenities.map((a) => (
                                <span
                                    key={a.name}
                                    className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground"
                                >
                                    {a.name}
                                </span>
                            ))}
                        </div>
                    </div>

                    <Separator />

                    {/* Hours & Location side by side */}
                    <div className="grid grid-cols-2 divide-x divide-border">
                        <div className="p-4">
                            <div className="flex items-center gap-1.5 mb-2">
                                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs font-semibold text-foreground">
                                    Hours
                                </span>
                            </div>
                            <div className="space-y-1">
                                {venueHours.map((h, i) => (
                                    <div key={i}>
                                        <p className="text-[11px] text-muted-foreground">
                                            {h.day}
                                        </p>
                                        <p className="text-[11px] font-medium text-foreground">
                                            {h.time}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button className="p-4 text-left hover:bg-accent/30 transition-colors">
                            <div className="flex items-center gap-1.5 mb-2">
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs font-semibold text-foreground">
                                    Location
                                </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                {facility.city}
                            </p>
                            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                                <span>Directions</span>
                                <ExternalLink className="h-2.5 w-2.5" />
                            </div>
                        </button>
                    </div>

                    <Separator />

                    {/* Policies */}
                    <div className="p-4 space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                            Policies
                        </p>
                        <button
                            onClick={() => setPoliciesSheetOpen(true)}
                            className="w-full flex items-start gap-2 text-left hover:opacity-75 transition-opacity"
                        >
                            <Shield className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-semibold text-foreground">
                                    Cancellation
                                </p>
                                <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                                    {cancellationPolicy ||
                                        'Contact venue for cancellation details.'}
                                </p>
                            </div>
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        </button>
                        <button
                            onClick={() => setPoliciesSheetOpen(true)}
                            className="w-full flex items-start gap-2 text-left hover:opacity-75 transition-opacity"
                        >
                            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-semibold text-foreground">
                                    Cancellation + Rescheduling
                                </p>
                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    Tap to view full policies
                                </p>
                            </div>
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center pb-2">
                    <button
                        onClick={() => navigate('/')}
                        className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                    >
                        Powered by EasyBook · Explore more venues
                    </button>
                </div>
            </div>

            {/* ── Modals & Sheets ── */}
            <PhoneLoginModal open={loginOpen} onOpenChange={setLoginOpen} />

            {/* Perk Detail Dialog */}
            <Dialog
                open={!!perkDetailOpen}
                onOpenChange={(open) => !open && setPerkDetailOpen(null)}
            >
                <DialogContent className="max-w-sm">
                    {perkDetailOpen && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-base">
                                    {perkDetailOpen.icon}
                                    {perkDetailOpen.name}
                                </DialogTitle>
                                <DialogDescription className="text-sm">
                                    {perkDetailOpen.description}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-2 mt-2">
                                <p className="text-xs font-semibold text-foreground">
                                    How it works
                                </p>
                                <ol className="space-y-1.5">
                                    {perkDetailOpen.howItWorks.map(
                                        (step, i) => (
                                            <li
                                                key={i}
                                                className="flex gap-2 text-xs text-muted-foreground"
                                            >
                                                <span className="shrink-0 font-semibold text-foreground">
                                                    {i + 1}.
                                                </span>
                                                {step}
                                            </li>
                                        ),
                                    )}
                                </ol>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Cancellation + Rescheduling Policies Sheet */}
            <Sheet open={policiesSheetOpen} onOpenChange={setPoliciesSheetOpen}>
                <SheetContent
                    side="bottom"
                    className="rounded-t-2xl max-h-[80vh] overflow-y-auto"
                >
                    <SheetHeader className="mb-4">
                        <SheetTitle>Cancellation &amp; Rescheduling</SheetTitle>
                    </SheetHeader>

                    <div className="space-y-5 pb-8">
                        {/* Cancellation Policy */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="rounded-full bg-red-100 dark:bg-red-950/30 p-1.5">
                                    <Shield className="h-4 w-4 text-red-600 dark:text-red-400" />
                                </div>
                                <p className="text-sm font-semibold text-foreground">
                                    Cancellation Policy
                                </p>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed pl-9">
                                {cancellationPolicy ||
                                    'Contact the venue directly for cancellation details.'}
                            </p>
                        </div>

                        <Separator />

                        {/* Minimum Notice */}
                        {facility.bookingPolicy && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="rounded-full bg-amber-100 dark:bg-amber-950/30 p-1.5">
                                        <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <p className="text-sm font-semibold text-foreground">
                                        Minimum Notice
                                    </p>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed pl-9">
                                    {facility.bookingPolicy
                                        .minimumNoticeMinutes >= 60
                                        ? `${Math.round(facility.bookingPolicy.minimumNoticeMinutes / 60)} hour${Math.round(facility.bookingPolicy.minimumNoticeMinutes / 60) !== 1 ? 's' : ''} before the booking start time`
                                        : `${facility.bookingPolicy.minimumNoticeMinutes} minutes before the booking start time`}
                                </p>
                            </div>
                        )}

                        <Separator />

                        {/* Rescheduling */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="rounded-full bg-blue-100 dark:bg-blue-950/30 p-1.5">
                                    <RefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <p className="text-sm font-semibold text-foreground">
                                    Rescheduling
                                </p>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed pl-9">
                                Contact the venue directly to reschedule your
                                booking. Rescheduling is subject to court
                                availability and the venue's discretion.
                            </p>
                        </div>

                        <Separator />

                        {/* Auto Confirm */}
                        {facility.bookingPolicy && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div
                                        className={`rounded-full p-1.5 ${facility.bookingPolicy.autoConfirm ? 'bg-emerald-100 dark:bg-emerald-950/30' : 'bg-muted'}`}
                                    >
                                        <Check
                                            className={`h-4 w-4 ${facility.bookingPolicy.autoConfirm ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}
                                        />
                                    </div>
                                    <p className="text-sm font-semibold text-foreground">
                                        Booking Confirmation
                                    </p>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed pl-9">
                                    {facility.bookingPolicy.autoConfirm
                                        ? 'Bookings are confirmed instantly upon payment.'
                                        : 'Bookings require manual confirmation from the venue after payment.'}
                                </p>
                            </div>
                        )}

                        {/* Advance Booking */}
                        {facility.bookingPolicy &&
                            facility.bookingPolicy.adavanceBookingDays > 0 && (
                                <>
                                    <Separator />
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className="rounded-full bg-violet-100 dark:bg-violet-950/30 p-1.5">
                                                <Zap className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                                            </div>
                                            <p className="text-sm font-semibold text-foreground">
                                                Advance Booking
                                            </p>
                                        </div>
                                        <p className="text-sm text-muted-foreground leading-relaxed pl-9">
                                            Courts can be booked up to{' '}
                                            <span className="font-medium text-foreground">
                                                {
                                                    facility.bookingPolicy
                                                        .adavanceBookingDays
                                                }{' '}
                                                days
                                            </span>{' '}
                                            in advance.
                                        </p>
                                    </div>
                                </>
                            )}
                    </div>
                </SheetContent>
            </Sheet>

            {/* Features & Perks Sheet */}
            <Sheet open={perksSheetOpen} onOpenChange={setPerksSheetOpen}>
                <SheetContent
                    side="bottom"
                    className="rounded-t-2xl max-h-[85vh] overflow-y-auto"
                >
                    <SheetHeader className="mb-1">
                        <SheetTitle>
                            Features & Perks at {facility.name}
                        </SheetTitle>
                    </SheetHeader>
                    <p className="text-sm text-muted-foreground mb-5">
                        Spend more to level up and unlock exclusive features at
                        this venue.
                    </p>

                    <div className="space-y-3 pb-8">
                        {tierOrder.map((tierKey, i) => {
                            const tMeta = TIER_META[tierKey];
                            const isCurrentTier = tierKey === currentTierName;
                            const isUnlocked = currentTierIndex >= i;
                            const config = tierConfigs.find(
                                (c: ApiTierConfig) => c.tier_name === tierKey,
                            );
                            const tPerks = TIER_PERKS[tierKey] || [];

                            const noBookings =
                                (membership?.totalBookings ?? 0) === 0;
                            const isDimmed =
                                noBookings ||
                                (!isUnlocked && currentTierIndex >= 0);

                            return (
                                <div
                                    key={tierKey}
                                    className={`rounded-xl border bg-card overflow-hidden transition-all ${isCurrentTier ? 'shadow-md ring-1 ring-primary/20' : ''} ${isDimmed ? 'opacity-40' : ''}`}
                                >
                                    <div
                                        className={`h-1 w-full ${tMeta.gradient}`}
                                    />
                                    <div className="p-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className={tMeta.color}>
                                                    {tMeta.icon}
                                                </span>
                                                <span className="font-bold text-foreground text-base">
                                                    {tMeta.label}
                                                </span>
                                                {isCurrentTier && (
                                                    <span className="text-xs font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5">
                                                        You're here
                                                    </span>
                                                )}
                                            </div>
                                            {config && config.min_spend > 0 && (
                                                <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5 shrink-0 ml-2">
                                                    ₹
                                                    {Number(
                                                        config.min_spend,
                                                    ).toLocaleString(
                                                        'en-IN',
                                                    )}{' '}
                                                    spend
                                                </span>
                                            )}
                                        </div>

                                        <div className="space-y-1.5 mt-3">
                                            {tPerks.map((perk) => (
                                                <button
                                                    key={perk.name}
                                                    onClick={() =>
                                                        setPerkDetailOpen(perk)
                                                    }
                                                    className="flex items-start gap-2 w-full text-left hover:bg-accent/40 rounded-lg px-2 py-1.5 -mx-2 transition-colors"
                                                >
                                                    <span
                                                        className={`mt-0.5 shrink-0 ${isUnlocked || currentTierIndex < 0 ? tMeta.color : 'text-muted-foreground'}`}
                                                    >
                                                        {perk.icon}
                                                    </span>
                                                    <div>
                                                        <p className="text-sm font-medium text-foreground">
                                                            {perk.name}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {perk.description}
                                                        </p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>

                                        {!isUnlocked &&
                                            creditPackages.length > 0 &&
                                            (() => {
                                                const fastTrackPkg =
                                                    creditPackages.find(
                                                        (p: CreditPackage) =>
                                                            (p as any)
                                                                .tier_grant ===
                                                            tierKey,
                                                    );
                                                if (!fastTrackPkg) return null;
                                                return (
                                                    <button
                                                        onClick={() => {
                                                            setPerksSheetOpen(
                                                                false,
                                                            );
                                                            setTimeout(
                                                                () =>
                                                                    setCreditsSheetOpen(
                                                                        true,
                                                                    ),
                                                                300,
                                                            );
                                                        }}
                                                        className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                                                    >
                                                        <Wallet className="h-3 w-3" />
                                                        Fast-track with a credit
                                                        package
                                                        <ChevronRight className="h-3 w-3" />
                                                    </button>
                                                );
                                            })()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </SheetContent>
            </Sheet>

            {/* Credit Packages Sheet */}
            <Sheet open={creditsSheetOpen} onOpenChange={setCreditsSheetOpen}>
                <SheetContent
                    side="bottom"
                    className="rounded-t-2xl max-h-[85vh] overflow-y-auto"
                >
                    <SheetHeader className="mb-1">
                        <SheetTitle className="flex items-center gap-2">
                            <Wallet className="h-5 w-5 text-primary" />
                            Credit Packages
                        </SheetTitle>
                    </SheetHeader>
                    <p className="text-sm text-muted-foreground mb-4">
                        Buy credits to save on bookings. Some packages instantly
                        unlock a higher tier.
                    </p>
                    <div className="space-y-2.5 pb-8">
                        {creditPackages.map((pkg) => {
                            const tierMeta = pkg.tierUnlock
                                ? TIER_META[pkg.tierUnlock.toLowerCase()]
                                : null;
                            return (
                                <Card key={pkg.id} className="overflow-hidden">
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-foreground mb-0.5">
                                                    {pkg.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground mb-2">
                                                    ₹
                                                    {Number(
                                                        pkg.amount,
                                                    ).toLocaleString(
                                                        'en-IN',
                                                    )}{' '}
                                                    added to wallet
                                                    {pkg.tierUnlock &&
                                                        ` + unlock ${pkg.tierUnlock.toLowerCase()} perks`}
                                                </p>
                                                {tierMeta && (
                                                    <div
                                                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${tierMeta.chipBg} ${tierMeta.chipText}`}
                                                    >
                                                        <span className="[&>svg]:h-2.5 [&>svg]:w-2.5">
                                                            {tierMeta.icon}
                                                        </span>
                                                        Unlocks {tierMeta.label}{' '}
                                                        Tier
                                                    </div>
                                                )}
                                            </div>
                                            <Button
                                                size="sm"
                                                className="shrink-0 mt-1"
                                                onClick={() => {
                                                    if (!user) {
                                                        setCreditsSheetOpen(
                                                            false,
                                                        );
                                                        setLoginOpen(true);
                                                        return;
                                                    }
                                                    // payment handled by CreditPackages component elsewhere
                                                }}
                                            >
                                                Buy ₹
                                                {Number(
                                                    pkg.amount,
                                                ).toLocaleString('en-IN')}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
};

export default Venues;
