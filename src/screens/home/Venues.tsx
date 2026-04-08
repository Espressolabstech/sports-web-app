import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getVenueDetail } from '../../api/adapters/venues';
import { getVenueTier } from '../../api/adapters/tier';
import { sportEmojis } from '../../utils/mockData';
import {
    ArrowLeft,
    Crown,
    ExternalLink,
    LogOut,
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
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { CreditPackages } from '../../components/CreditPackage';
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

const TIER_META: Record<
    string,
    {
        label: string;
        icon: React.ReactNode;
        gradient: string;
        bgGradient: string;
        color: string;
        bgClass: string;
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
    },
    pro: {
        label: 'Pro',
        icon: <Star className="h-5 w-5" />,
        gradient: 'bg-gradient-to-r from-emerald-500 to-teal-400',
        bgGradient:
            'bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-900/40',
        color: 'text-emerald-600 dark:text-emerald-400',
        bgClass: 'bg-emerald-500/10',
    },
    elite: {
        label: 'Elite',
        icon: <Crown className="h-5 w-5" />,
        gradient: 'bg-gradient-to-r from-violet-600 to-fuchsia-400',
        bgGradient:
            'bg-gradient-to-br from-violet-50 via-fuchsia-50 to-violet-100 dark:from-violet-950/40 dark:via-fuchsia-950/30 dark:to-violet-900/40',
        color: 'text-violet-600 dark:text-violet-400',
        bgClass: 'bg-violet-500/10',
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

const Venues = () => {
    const { venueId } = useParams();
    const navigate = useNavigate();
    const user = !!getToken();
    const [loginOpen, setLoginOpen] = useState(false);
    const [loyaltyOpen, setLoyaltyOpen] = useState(false);
    const [perkDetailOpen, setPerkDetailOpen] = useState<TierPerkInfo | null>(
        null,
    );

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
    const creditPackages: CreditPackage[] = (venueData?.data?.creditPackages ?? []) as CreditPackage[];

    const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const venueInfo = {
        googleMapsUrl: '',
        hours: (facility?.venueHours ?? []).map((h) => ({
            day: DAY_NAMES[h.dayOfWeek],
            time: h.isClosed ? 'Closed' : `${h.openTime} – ${h.closeTime}`,
        })),
        cancellationPolicy: facility?.bookingPolicy?.cancellationPolicy ?? '',
        reschedulingPolicy: '',
    };

    // Tier display data
    const tierConfigs: ApiTierConfig[] = tierData?.data?.tier_configs ?? [];
    const currentTierName = membership?.tier ? membership.tier.toLowerCase() : null;
    const spendProgress = membership?.tierProgress?.spendProgressPct ?? (currentTierName === 'elite' ? 100 : 0);
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

    // Group courts by sport
    const sportGroups = Object.entries(courtsBySport).map(([sport, sportCourts]) => {
        const minPrice =
            sportCourts.length > 0
                ? Math.min(...sportCourts.map((c) => c.courtPricings[0]?.pricePerSlot ?? 0))
                : 0;
        return { sport, courtCount: sportCourts.length, minPrice };
    });

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

    const handleShare = async () => {
        const shareData = {
            title: facility.name,
            text: `Book courts at ${facility.name} — ${facility.address}, ${facility.city}`,
            url: window.location.href,
        };
        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (_) {}
        } else {
            await navigator.clipboard.writeText(window.location.href);
        }
    };

    return (
        <div className="min-h-screen bg-background pb-10">
            {/* Hero */}
            <div className="relative">
                <div className="h-56 w-full overflow-hidden bg-muted">
                    {facility.venueImages.length > 0 && (
                        <img
                            src={facility.venueImages[0].url}
                            alt={facility.name}
                            className="h-full w-full object-cover"
                        />
                    )}
                    {/* gradient fade at bottom */}
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
                </div>

                {/* Back button */}
                <div className="absolute left-3 top-3">
                    <button
                        onClick={() => navigate('/')}
                        className="rounded-full bg-card/80 p-2 backdrop-blur-sm hover:bg-card transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-foreground" />
                    </button>
                </div>

                {/* Top-right actions */}
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
                                <DropdownMenuItem
                                    // onClick={logout}
                                    className="text-destructive"
                                >
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Sign Out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>

            <div className="mx-auto max-w-lg px-4">
                {/* ── Venue identity ── */}
                <div className="pt-2 pb-4">
                    <h1 className="text-2xl font-bold text-foreground">
                        {facility.name}
                    </h1>
                    <button
                        onClick={() =>
                            window.open(venueInfo.googleMapsUrl, '_blank')
                        }
                        className="mt-1 flex w-full items-start gap-1.5 text-sm text-primary hover:underline text-left"
                    >
                        <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span className="min-w-0 flex-1 break-words">{facility.address}, {facility.city}</span>
                        <ExternalLink className="h-3 w-3 opacity-60 shrink-0 mt-0.5" />
                    </button>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {facility.description}
                    </p>
                </div>

                {/* ── Features & Perks card — only show if user has booked here ── */}
                {(membership?.totalBookings ?? 0) > 0 && (() => {
                    const meta = currentTierName
                        ? TIER_META[currentTierName]
                        : null;
                    const perks = currentTierName
                        ? TIER_PERKS[currentTierName]
                        : [];

                    const nextLabel = nextTierName
                        ? TIER_META[nextTierName]?.label
                        : null;
                    const upgradeHint =
                        nextTierName && remainSpend > 0
                            ? `Spend ₹${remainSpend.toLocaleString('en-IN')} more to upgrade to ${nextLabel}`
                            : nextLabel
                              ? `You're about to reach ${nextLabel}`
                              : null;

                    return (
                        <div
                            className={`rounded-2xl mb-5 overflow-hidden relative ${meta ? meta.bgGradient : 'bg-card border'}`}
                        >
                            {/* Subtle decorative circles */}
                            {meta && (
                                <>
                                    <div
                                        className="absolute -top-6 -right-6 h-24 w-24 rounded-full opacity-[0.07] bg-current"
                                        style={{ color: 'currentColor' }}
                                    />
                                    <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full opacity-[0.05] bg-current" />
                                </>
                            )}

                            <div className="relative px-5 py-4">
                                {/* Top: tier badge + info button */}
                                <div className="flex items-start justify-between">
                                    {!currentTierName ? (
                                        <div>
                                            <p className="text-base font-bold text-foreground">
                                                Features & Perks
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Book once to start unlocking
                                                perks
                                            </p>
                                        </div>
                                    ) : (
                                        <div>
                                            {/* Large tier name */}
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className={`flex items-center justify-center h-9 w-9 rounded-xl ${meta!.bgClass} ${meta!.color}`}
                                                >
                                                    {meta!.icon}
                                                </div>
                                                <div>
                                                    <p
                                                        className={`text-2xl font-extrabold tracking-tight ${meta!.color}`}
                                                    >
                                                        {meta!.label}
                                                    </p>
                                                </div>
                                            </div>
                                            {currentTierName === 'elite' && (
                                                <p className="text-xs font-medium text-muted-foreground mt-1 ml-11">
                                                    Highest tier — all perks
                                                    unlocked
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setLoyaltyOpen(true)}
                                        className="mt-1 text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors shrink-0"
                                        aria-label="View all tiers"
                                    >
                                        <Info className="h-4 w-4" />
                                    </button>
                                </div>

                                {/* Progress bar + upgrade text */}
                                {currentTierName &&
                                    nextTierName && (
                                        <div className="mt-4">
                                            <div className="h-2 w-full rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${meta!.gradient}`}
                                                    style={{
                                                        width: `${spendProgress}%`,
                                                    }}
                                                />
                                            </div>
                                            {upgradeHint && (
                                                <p className="text-xs text-muted-foreground mt-2">
                                                    {upgradeHint}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                {/* Perks list */}
                                {currentTierName && perks.length > 0 && (
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
                    );
                })()}
                {/* ── Book By Sport ── */}
                <section className="mb-6">
                    <h2 className="text-sm font-semibold text-foreground mb-2">
                        Book a Court
                    </h2>
                    <div className="space-y-2">
                        {sportGroups.map(({ sport, courtCount, minPrice }) => (
                            <Card
                                key={sport}
                                className="cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => handleBookSport(sport)}
                            >
                                <CardContent className="flex items-center gap-3 p-4">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-xl shrink-0">
                                        {sportEmojis[sport] || '⚽'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-foreground">
                                            {sport}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {courtCount} court
                                            {courtCount !== 1 ? 's' : ''} · From
                                            ₹{minPrice}/hr
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        className="gap-1 shrink-0"
                                    >
                                        Book
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>

                {/* ── Credit Packages ── */}
                {creditPackages.length > 0 && (
                    <CreditPackages
                        packages={creditPackages}
                        venueName={facility.name}
                        venueId={facility.id}
                        isLoggedIn={!!user}
                        onLoginRequired={() => setLoginOpen(true)}
                    />
                )}

                {/* ── Amenities ── */}
                <section className="mb-6">
                    <h2 className="text-sm font-semibold text-foreground mb-2">
                        Amenities
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        {facility.venueAmenities.map((a) => (
                            <span
                                key={a.name}
                                className="rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground"
                            >
                                {a.name}
                            </span>
                        ))}
                    </div>
                </section>

                <Separator className="mb-6" />

                {/* ── Hours & Location row ── */}
                <section className="mb-6 grid grid-cols-2 gap-3">
                    {/* Hours */}
                    <div className="rounded-xl border bg-card p-4">
                        <div className="flex items-center gap-1.5 mb-2">
                            <Clock className="h-4 w-4 text-primary" />
                            <span className="text-xs font-semibold text-foreground">
                                Hours
                            </span>
                        </div>
                        <div className="space-y-0.5">
                            {venueInfo.hours.map((h) => (
                                <div key={h.day}>
                                    <p className="text-xs text-muted-foreground">
                                        {h.day}
                                    </p>
                                    <p className="text-xs font-medium text-foreground">
                                        {h.time}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Location / Maps */}
                    <button
                        onClick={() =>
                            window.open(venueInfo.googleMapsUrl, '_blank')
                        }
                        className="rounded-xl border bg-card p-4 text-left hover:bg-accent/50 transition-colors"
                    >
                        <div className="flex items-center gap-1.5 mb-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            <span className="text-xs font-semibold text-foreground">
                                Location
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            {facility.address}, {facility.city}
                        </p>
                        <div className="mt-2 flex items-center gap-1 text-xs text-primary font-medium">
                            <span>Get directions</span>
                            <ExternalLink className="h-3 w-3" />
                        </div>
                    </button>
                </section>

                {/* ── Policies ── */}
                <section className="mb-6 space-y-3">
                    <h2 className="text-sm font-semibold text-foreground">
                        Policies
                    </h2>

                    <div className="rounded-xl border bg-card p-4 space-y-1">
                        <div className="flex items-center gap-2 mb-1">
                            <Shield className="h-4 w-4 text-primary shrink-0" />
                            <span className="text-xs font-semibold text-foreground">
                                Cancellation
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                            {venueInfo.cancellationPolicy}
                        </p>
                    </div>

                    <div className="rounded-xl border bg-card p-4 space-y-1">
                        <div className="flex items-center gap-2 mb-1">
                            <RefreshCw className="h-4 w-4 text-primary shrink-0" />
                            <span className="text-xs font-semibold text-foreground">
                                Rescheduling
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                            {venueInfo.reschedulingPolicy}
                        </p>
                    </div>
                </section>

                {/* ── Footer ── */}
                <div className="text-center pt-2 pb-2">
                    <button
                        onClick={() => navigate('/')}
                        className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                    >
                        Powered by EasyBook · Explore more venues
                    </button>
                </div>
            </div>

            <PhoneLoginModal open={loginOpen} onOpenChange={setLoginOpen} />

            {/* ── Perk Detail Dialog ── */}
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

            {/* ── Features & Perks Sheet ── */}
            <Sheet open={loyaltyOpen} onOpenChange={setLoyaltyOpen}>
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
                        Book more to level up and unlock exclusive features at
                        this venue.
                    </p>

                    <div className="space-y-3 pb-8">
                        {tierOrder.map((tierKey, i) => {
                            const meta = TIER_META[tierKey];
                            const isCurrentTier = tierKey === currentTierName;
                            const isUnlocked = currentTierIndex >= i;
                            const config = tierConfigs.find(
                                (c: any) => c.tier_name === tierKey,
                            );
                            const perks = TIER_PERKS[tierKey] || [];

                            return (
                                <div
                                    key={tierKey}
                                    className={`rounded-xl border bg-card overflow-hidden transition-all ${isCurrentTier ? 'shadow-md ring-1 ring-primary/20' : ''} ${!isUnlocked ? 'opacity-50' : ''}`}
                                >
                                    <div
                                        className={`h-1 w-full ${meta.gradient}`}
                                    />
                                    <div className="p-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className={meta.color}>
                                                    {meta.icon}
                                                </span>
                                                <span className="font-bold text-foreground text-base">
                                                    {meta.label}
                                                </span>
                                                {isCurrentTier && (
                                                    <span className="text-xs font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5">
                                                        You're here
                                                    </span>
                                                )}
                                            </div>
                                            {!isUnlocked && config && (
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

                                        {/* Perks list */}
                                        <div className="space-y-1.5 mt-3">
                                            {perks.map((perk) => (
                                                <div
                                                    key={perk.name}
                                                    className="flex items-start gap-2"
                                                >
                                                    <span
                                                        className={`mt-0.5 shrink-0 ${isUnlocked ? meta.color : 'text-muted-foreground'}`}
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
                                                </div>
                                            ))}
                                            {perks.length === 0 && (
                                                <p className="text-xs text-muted-foreground">
                                                    Base tier — book to start
                                                    unlocking perks
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
};

export default Venues;
