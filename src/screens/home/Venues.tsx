import { useState } from 'react';
import { cn } from '../../utils/twMerge';
import { AnimatedLoader } from '../../components/AnimatedLoader';
import { getSportLabel } from '../../utils/sports';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getVenueDetail } from '../../api/adapters/venues';
import { getVenueTier } from '../../api/adapters/tier';
import {
    purchaseCreditPackage,
    verifyCreditPayment,
} from '../../api/adapters/creditPackages';
import { getWallet } from '../../api/adapters/wallet';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
    ArrowLeft,
    MapPin,
    Percent,
    Share2,
    Shield,
    Zap,
    ChevronRight,
    Clock,
    RefreshCw,
    Check,
    Wallet,
    LogOut,
    Rocket,
    Coins,
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
import { TIER_META, TIER_PERKS, TIER_PERK_KEYS } from '../../utils/tierMeta';
import padelIcon from '../../assets/padel-Icon.png';
import pickleballIcon from '../../assets/pickleball-Icon.png';
import tennisIcon from '../../assets/tennis-Icon.png';

// Tier metadata (labels, colors, perks) is shared with VenuePoints.tsx — see utils/tierMeta.tsx

// Static rewards icon: gold coin with star and ribbon tails
function RewardsCoinIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient
                    id="rewards-coin-gold"
                    x1="2"
                    y1="2"
                    x2="22"
                    y2="22"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop stopColor="#FCD34D" />
                    <stop offset="1" stopColor="#F59E0B" />
                </linearGradient>
            </defs>
            {/* Ribbon tails */}
            <path d="M8.5 15.5 L6 21 L10.5 18.5 L12 15.5" fill="#FB7185" />
            <path d="M15.5 15.5 L18 21 L13.5 18.5 L12 15.5" fill="#F43F5E" />
            {/* Coin */}
            <circle cx="12" cy="10" r="7" fill="url(#rewards-coin-gold)" />
            <circle
                cx="12"
                cy="10"
                r="5.5"
                fill="none"
                stroke="#FEF3C7"
                strokeWidth="1"
                strokeOpacity="0.7"
            />
            {/* Star */}
            <path
                d="M12 7 L13 9.35 L15.5 9.65 L13.6 11.3 L14.15 13.75 L12 12.45 L9.85 13.75 L10.4 11.3 L8.5 9.65 L11 9.35 Z"
                fill="#FFF7ED"
            />
        </svg>
    );
}

const SPORT_IMAGES: Record<string, string> = {
    PADEL: padelIcon,
    PICKLEBALL: pickleballIcon,
    PICKELBALL: pickleballIcon,
    TENNIS: tennisIcon,
    Padel: padelIcon,
    Pickleball: pickleballIcon,
    Tennis: tennisIcon,
};

const Venues = () => {
    const { venueId } = useParams();
    const navigate = useNavigate();
    const user = !!getToken();
    const [loginOpen, setLoginOpen] = useState(false);
    const [pendingBookSport, setPendingBookSport] = useState<string | null>(null);
    const [perksSheetOpen, setPerksSheetOpen] = useState(false);
    const [creditsSheetOpen, setCreditsSheetOpen] = useState(false);
    const [perkDetailOpen, setPerkDetailOpen] = useState<TierPerkInfo | null>(
        null,
    );
    const [policiesSheetOpen, setPoliciesSheetOpen] = useState(false);
    const [confirmPkg, setConfirmPkg] = useState<CreditPackage | null>(null);
    const [purchasing, setPurchasing] = useState(false);
    const queryClient = useQueryClient();

    const handleConfirmPurchase = async () => {
        if (!confirmPkg || !facility) return;
        setPurchasing(true);
        try {
            const res = await purchaseCreditPackage(confirmPkg.id, {
                venueId: facility.id,
            });
            const { razorpay } = res.data as any;

            const options: RazorpayOptions = {
                key: razorpay.keyId,
                amount: razorpay.amount,
                currency: razorpay.currency,
                order_id: razorpay.orderId,
                name: facility.name,
                description: confirmPkg.name,
                handler: async (response) => {
                    try {
                        await verifyCreditPayment({
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpayOrderId: response.razorpay_order_id,
                            razorpaySignature: response.razorpay_signature,
                            packageId: confirmPkg.id,
                        });
                        toast.success('Points added to your account!', {
                            description: `${Number(confirmPkg.amount).toLocaleString('en-IN')} points are ready to use at ${facility.name}.`,
                        });
                        queryClient.invalidateQueries({
                            queryKey: ['venue', venueId],
                        });
                        queryClient.invalidateQueries({
                            queryKey: ['venue-tier', venueId],
                        });
                        queryClient.invalidateQueries({
                            queryKey: ['venue-wallet', venueId],
                        });
                    } catch {
                        toast.error('Payment verification failed', {
                            description:
                                'Please contact support with your payment ID.',
                        });
                    }
                },
                modal: { ondismiss: () => toast.info('Payment cancelled') },
                theme: { color: '#2563eb' },
            };

            const rzp = new window.Razorpay(options);
            setCreditsSheetOpen(false);
            rzp.open();
        } catch (err: any) {
            toast.error('Could not initiate purchase', {
                description: err?.message || 'Please try again.',
            });
        } finally {
            setPurchasing(false);
            setConfirmPkg(null);
        }
    };

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

    const { data: walletData } = useQuery({
        queryKey: ['venue-wallet', venueId],
        queryFn: () => getWallet(venueId!),
        enabled: !!venueId && !!user,
    });
    const walletBalance = Number(walletData?.data?.wallet?.balance ?? 0);

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

    const tierOrder = ['club', 'pro', 'elite'];
    const currentTierIndex = currentTierName
        ? tierOrder.indexOf(currentTierName)
        : -1;

    const meta = currentTierName ? TIER_META[currentTierName] : null;

    const cancellationPolicy =
        facility?.bookingPolicy?.cancellationPolicy ?? '';

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

    if (venueLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <AnimatedLoader label="Loading venue…" />
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
        const firstCourt = allCourts.find(
            (c: ApiCourt) => c.sport.toLowerCase() === sport.toLowerCase(),
        );
        navigate(
            `/booking/${facility.id}${firstCourt ? `/${firstCourt.id}` : ''}`,
        );
    };

    const handleShare = async () => {
        const sports = sportGroups.map((g) => g.sport).join(' & ');
        const mapsLink =
            facility.latitude && facility.longitude
                ? `https://maps.google.com/?q=${facility.latitude},${facility.longitude}`
                : `https://maps.google.com/?q=${encodeURIComponent(`${facility.name} ${facility.city}`)}`;

        const lines = [
            `🏟️ Check out ${facility.name} on BookEase!`,
            ``,
            `🎾 Sports: ${sports}`,
            `📍 Location: ${facility.city}`,
            `🗺️ Directions: ${mapsLink}`,
            ``,
            `📅 Book a court now: ${window.location.href}`,
            ``,
            `See you on the court! 🏆`,
        ];
        const text = lines.join('\n');

        if (navigator.share) {
            try {
                await navigator.share({
                    title: `🏟️ ${facility.name} on BookEase`,
                    text,
                });
            } catch {
                // user cancelled
            }
        } else {
            await navigator.clipboard.writeText(text);
        }
    };

    return (
        <div className="min-h-screen bg-background pb-10">
            {/* SVG gradient defs for icon strokes */}
            <svg width="0" height="0" className="absolute" aria-hidden="true">
                <defs>
                    <linearGradient id="icon-grad-orange" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="hsl(25 90% 58%)" />
                        <stop offset="100%" stopColor="hsl(15 80% 50%)" />
                    </linearGradient>
                    <linearGradient id="icon-grad-green" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="hsl(150 55% 48%)" />
                        <stop offset="100%" stopColor="hsl(160 60% 36%)" />
                    </linearGradient>
                </defs>
            </svg>

            {/* ── Hero ── */}
            <div className="relative mx-auto max-w-5xl">
                <div className="aspect-[21/9] max-h-[45vh] w-full overflow-hidden bg-muted md:rounded-b-2xl">
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
                                    Profile &amp; Bookings
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
                <div className="pt-3 pb-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <h1 className="text-2xl font-bold text-foreground truncate">
                                {facility.name}
                            </h1>
                            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                                <button
                                    onClick={() => {
                                        const loc = [
                                            facility.address,
                                            facility.city,
                                        ]
                                            .filter(Boolean)
                                            .join(', ');
                                        const url =
                                            facility.latitude &&
                                            facility.longitude
                                                ? `https://maps.google.com/?q=${facility.latitude},${facility.longitude}`
                                                : `https://maps.google.com/?q=${encodeURIComponent(loc)}`;
                                        window.open(url, '_blank');
                                    }}
                                    className="inline-flex items-center gap-1.5 hover:underline text-left"
                                >
                                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">
                                        {[facility.area, facility.city]
                                            .filter(Boolean)
                                            .join(' · ')}
                                    </span>
                                </button>
                                <span className="text-muted-foreground/40">
                                    ·
                                </span>
                                <button
                                    onClick={() =>
                                        navigate(`/venue/${venueId}/about`)
                                    }
                                    className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline shrink-0"
                                >
                                    About
                                    <ChevronRight className="h-3 w-3" />
                                </button>
                            </div>
                        </div>

                        {/* Points */}
                        {!user ? (
                            <div className="self-center shrink-0">
                                <button
                                    onClick={() => setLoginOpen(true)}
                                    aria-label="Sign in to start earning points at this venue"
                                    className="inline-flex items-center gap-1.5 rounded-2xl border border-border bg-background pl-2.5 pr-1.5 py-1.5 hover:bg-accent/50 transition-colors active:scale-95"
                                >
                                    <RewardsCoinIcon className="h-[18px] w-[18px] opacity-50" />
                                    <span className="text-xs font-medium text-muted-foreground">
                                        Earn points
                                    </span>
                                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/70" />
                                </button>
                            </div>
                        ) : (
                            <div className="self-center shrink-0 p-[1px] rounded-2xl bg-gradient-to-br from-amber-200 via-amber-300 to-amber-400 hover:from-amber-300 hover:via-amber-400 hover:to-amber-500 transition-all active:scale-95">
                                <button
                                    onClick={() =>
                                        navigate(`/venue/${venueId}/points`)
                                    }
                                    aria-label={`${walletBalance.toLocaleString('en-IN')} points at this venue`}
                                    className="inline-flex items-center gap-1.5 rounded-[15px] bg-background pl-2.5 pr-1.5 py-1.5 transition-colors"
                                >
                                    <RewardsCoinIcon className="h-[18px] w-[18px]" />
                                    <span
                                        className={cn(
                                            'text-sm font-semibold tabular-nums',
                                            walletBalance === 0
                                                ? 'text-muted-foreground'
                                                : 'text-foreground',
                                        )}
                                    >
                                        {walletBalance.toLocaleString('en-IN')}
                                        <span className="ml-0.5 text-[10px] font-medium text-muted-foreground">
                                            pts
                                        </span>
                                    </span>
                                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/70" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <Separator className="mb-5" />

                {/* ── Section 2: Book a Court ── */}
                <section className="mb-6">
                    <h2 className="text-[15px] font-medium text-muted-foreground mb-3 tracking-tight">
                        Book a Court
                    </h2>
                    <div className="space-y-2.5">
                        {sportGroups.map(({ sport, courtCount, minPrice }) => {
                            const sportLabel = getSportLabel(sport);
                            const sportImg = SPORT_IMAGES[sport];
                            return (
                                <button
                                    key={sport}
                                    className="w-full flex items-center gap-4 rounded-2xl border bg-card p-3.5 pr-4 hover:shadow-md hover:border-foreground/20 transition-all text-left group"
                                    onClick={() => handleBookSport(sport)}
                                >
                                    <div className="shrink-0 h-14 w-14 flex items-center justify-center overflow-hidden">
                                        {sportImg ? (
                                            <img
                                                src={sportImg}
                                                alt={sportLabel}
                                                className="h-14 w-14 object-contain"
                                            />
                                        ) : (
                                            <Shield className="h-6 w-6 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-foreground text-[15px] leading-tight tracking-tight">
                                            {sportLabel}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {courtCount} court
                                            {courtCount !== 1 ? 's' : ''} · From{' '}
                                            <span className="font-semibold text-foreground/80">
                                                ₹{minPrice}
                                            </span>
                                            /hr
                                        </p>
                                    </div>
                                    <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-5 h-10 text-sm font-semibold text-primary-foreground bg-gradient-to-b from-primary to-[hsl(var(--primary)/0.85)] shadow-[0_1px_0_hsl(var(--primary-foreground)/0.25)_inset,0_6px_16px_-6px_hsl(var(--primary)/0.55)] ring-1 ring-primary/40 group-hover:shadow-[0_1px_0_hsl(var(--primary-foreground)/0.25)_inset,0_10px_22px_-8px_hsl(var(--primary)/0.6)] group-hover:-translate-y-px transition-all">
                                        Book
                                        <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* ── Tinted Band: Level Up + Credits ── */}
                <div className="-mx-4 px-4 pt-5 pb-2 mt-2 rounded-t-3xl bg-gradient-to-b from-muted/80 via-muted/45 to-muted/10">
                    <div className="space-y-3">
                        {/* Level Up card */}
                        <button
                            onClick={() => setPerksSheetOpen(true)}
                            className="group text-left rounded-2xl border border-border/50 bg-card px-4 pt-3.5 pb-3 hover:border-foreground/20 hover:shadow-sm transition-all w-full"
                        >
                            <div className="flex items-center gap-2.5">
                                <Rocket
                                    className="h-[18px] w-[18px] shrink-0 [&_path]:[stroke:url(#icon-grad-orange)] [&_polygon]:[stroke:url(#icon-grad-orange)]"
                                    strokeWidth={2.25}
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[15px] font-semibold text-foreground tracking-tight leading-tight">
                                        Level Up
                                    </p>
                                    <p className="text-[12.5px] text-muted-foreground mt-0.5 leading-snug">
                                        Unlock perks as you play
                                    </p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground/70 group-hover:translate-x-0.5 transition-all shrink-0" />
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-3 pl-[26px]">
                                <span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.05] px-2 py-0.5 text-[11px] font-medium text-foreground/75">
                                    <RefreshCw className="h-2.5 w-2.5 text-foreground/45" />
                                    Flexible cancellation
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.05] px-2 py-0.5 text-[11px] font-medium text-foreground/75">
                                    <Percent className="h-2.5 w-2.5 text-foreground/45" />
                                    Rental discount
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.05] px-2 py-0.5 text-[11px] font-medium text-foreground/75">
                                    <Zap className="h-2.5 w-2.5 text-foreground/45" />
                                    Early access
                                </span>
                            </div>
                        </button>

                        {/* Club Credits card */}
                        {creditPackages.length > 0 && (
                            <button
                                onClick={() => setCreditsSheetOpen(true)}
                                className="group text-left rounded-2xl border border-border/50 bg-card px-4 pt-3.5 pb-3 hover:border-foreground/20 hover:shadow-sm transition-all w-full"
                            >
                                <div className="flex items-center gap-2.5">
                                    <Coins
                                        className="h-[18px] w-[18px] shrink-0 [&_path]:[stroke:url(#icon-grad-green)] [&_circle]:[stroke:url(#icon-grad-green)] [&_ellipse]:[stroke:url(#icon-grad-green)] [&_line]:[stroke:url(#icon-grad-green)]"
                                        strokeWidth={2.25}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[15px] font-semibold text-foreground tracking-tight leading-tight">
                                            Club Points
                                        </p>
                                        <p className="text-[12.5px] text-muted-foreground mt-0.5 leading-snug">
                                            Pay less, play more
                                        </p>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground/70 group-hover:translate-x-0.5 transition-all shrink-0" />
                                </div>
                                <div className="flex flex-wrap gap-1.5 mt-3 pl-[26px]">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.05] px-2 py-0.5 text-[11px] font-medium text-foreground/75">
                                        {user
                                            ? `${walletBalance.toLocaleString('en-IN')} pts balance`
                                            : 'Bonus points on purchase'}
                                    </span>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.05] px-2 py-0.5 text-[11px] font-medium text-foreground/75">
                                        Fast-track your tier
                                    </span>
                                </div>
                            </button>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="text-center pt-6 pb-2">
                        <button
                            onClick={() => navigate('/')}
                            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                        >
                            Powered by BookEase · Explore more venues
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Modals & Sheets ── */}
            <PhoneLoginModal
                open={loginOpen}
                onOpenChange={setLoginOpen}
                onSuccess={() => {
                    if (pendingBookSport && facility) {
                        const firstCourt = allCourts.find(
                            (c: ApiCourt) =>
                                c.sport.toLowerCase() ===
                                pendingBookSport.toLowerCase(),
                        );
                        navigate(
                            `/booking/${facility.id}${firstCourt ? `/${firstCourt.id}` : ''}`,
                        );
                        setPendingBookSport(null);
                    }
                }}
            />

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

            {/* Level Up Dialog */}
            <Dialog open={perksSheetOpen} onOpenChange={setPerksSheetOpen}>
                <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                    <DialogHeader className="mb-1">
                        <DialogTitle>Level Up</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground -mt-3 mb-4">
                        Book to unlock tiers and rewards
                    </p>

                    <div className="space-y-3 pb-8">
                        {tierOrder.map((tierKey, i) => {
                            const tMeta = TIER_META[tierKey];
                            const isCurrentTier = tierKey === currentTierName;
                            const isUnlocked = currentTierIndex >= i;
                            const config = tierConfigs.find(
                                (c: ApiTierConfig) => c.tier_name === tierKey,
                            );

                            const prevTierKey = i > 0 ? tierOrder[i - 1] : null;
                            const prevPerkKeys = prevTierKey
                                ? TIER_PERK_KEYS[prevTierKey] ?? []
                                : [];
                            const newPerks = (TIER_PERKS[tierKey] ?? []).filter(
                                (p) => !prevPerkKeys.includes(p.key),
                            );

                            const fastTrackPkg =
                                creditPackages.find(
                                    (p: CreditPackage) =>
                                        (p as any).tier_grant === tierKey,
                                ) ?? null;

                            return (
                                <div
                                    key={tierKey}
                                    className={`rounded-xl border bg-card overflow-hidden ${isCurrentTier ? 'ring-1 ring-primary/20' : ''}`}
                                >
                                    {/* Colored top line */}
                                    <div className={`h-1 w-full ${tMeta.gradient}`} />

                                    <div className="p-4">
                                        {/* Tier header row */}
                                        <div className="flex items-center justify-between mb-3">
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

                                            {/* Spend badge — with Fast Track if not yet unlocked */}
                                            {config && config.min_spend > 0 && (
                                                !isUnlocked && fastTrackPkg ? (
                                                    <button
                                                        onClick={() => {
                                                            setPerksSheetOpen(false);
                                                            setTimeout(() => setCreditsSheetOpen(true), 300);
                                                        }}
                                                        className="rounded-lg border border-primary/25 bg-primary/5 px-2.5 py-1.5 text-right hover:bg-primary/10 transition-colors shrink-0"
                                                    >
                                                        <p className="text-[11px] text-muted-foreground leading-tight">
                                                            ₹{Number(config.min_spend).toLocaleString('en-IN')} spend
                                                        </p>
                                                        <p className="text-[11px] font-semibold text-primary flex items-center justify-end gap-0.5 mt-0.5">
                                                            <Zap className="h-3 w-3" />
                                                            Fast Track
                                                        </p>
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground bg-muted rounded-full px-2.5 py-0.5 shrink-0">
                                                        ₹{Number(config.min_spend).toLocaleString('en-IN')} spend
                                                    </span>
                                                )
                                            )}
                                        </div>

                                        {/* "Everything in X, plus:" */}
                                        {prevTierKey && (
                                            <p className="text-xs text-muted-foreground mb-2.5">
                                                Everything in{' '}
                                                <span className="font-semibold text-foreground">
                                                    {TIER_META[prevTierKey].label}
                                                </span>
                                                , plus:
                                            </p>
                                        )}

                                        {/* Perk rows — outlined cards */}
                                        <div className="space-y-2">
                                            {newPerks.map((perk) => (
                                                <button
                                                    key={perk.key}
                                                    onClick={() => setPerkDetailOpen(perk)}
                                                    className={`flex items-start gap-2.5 w-full text-left rounded-lg border px-3 py-2.5 hover:bg-accent/30 transition-colors ${!isUnlocked && currentTierIndex >= 0 ? 'opacity-50' : ''}`}
                                                >
                                                    <span
                                                        className={`mt-0.5 shrink-0 ${isUnlocked || currentTierIndex < 0 ? tMeta.color : 'text-muted-foreground'}`}
                                                    >
                                                        {perk.icon}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-foreground leading-tight">
                                                            {perk.name}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                                            {perk.description}
                                                        </p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Credit Packages Sheet */}
            <Sheet open={creditsSheetOpen} onOpenChange={setCreditsSheetOpen}>
                <SheetContent
                    side="bottom"
                    className="rounded-t-2xl max-h-[85vh] overflow-y-auto"
                >
                    <SheetHeader className="mb-3">
                        <SheetTitle className="flex items-center gap-2">
                            <Wallet className="h-5 w-5 text-primary" />
                            Points Packages
                        </SheetTitle>
                    </SheetHeader>

                    {/* Points balance + current tier summary */}
                    {user && (
                        <div className="flex items-center gap-3 rounded-xl bg-muted/60 px-4 py-3 mb-4">
                            <div className="flex-1">
                                <p className="text-xs text-muted-foreground">
                                    Points Balance
                                </p>
                                <p className="text-base font-bold text-foreground">
                                    {walletBalance.toLocaleString('en-IN')} pts
                                </p>
                            </div>
                            {currentTierName && meta && (
                                <div
                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${meta.chipBg} ${meta.chipText}`}
                                >
                                    <span className="[&>svg]:h-3 [&>svg]:w-3">
                                        {meta.icon}
                                    </span>
                                    {meta.label} Tier
                                </div>
                            )}
                            {!currentTierName && (
                                <p className="text-xs text-muted-foreground">
                                    No tier yet
                                </p>
                            )}
                        </div>
                    )}

                    <p className="text-sm text-muted-foreground mb-4">
                        Buy points to save on bookings. Some packages instantly
                        unlock a higher tier.
                    </p>

                    <div className="space-y-2.5 pb-8">
                        {creditPackages.map((pkg) => {
                            const tierMeta = pkg.tierUnlock
                                ? TIER_META[pkg.tierUnlock.toLowerCase()]
                                : null;
                            const pkgTierRank = pkg.tierUnlock
                                ? tierOrder.indexOf(
                                      pkg.tierUnlock.toLowerCase(),
                                  )
                                : -1;
                            const tierAlreadyUnlocked =
                                pkg.tierUnlock !== null &&
                                pkgTierRank <= currentTierIndex;
                            const isUpgrade =
                                pkg.tierUnlock !== null && !tierAlreadyUnlocked;

                            return (
                                <Card
                                    key={pkg.id}
                                    className="overflow-hidden"
                                >
                                    <CardContent className="p-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                                    <p className="font-semibold text-sm text-foreground">
                                                        {pkg.name}
                                                    </p>
                                                    {tierMeta && (
                                                        <span
                                                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tierMeta.chipText} border-current/20`}
                                                        >
                                                            <span className="[&>svg]:h-2.5 [&>svg]:w-2.5">
                                                                {tierMeta.icon}
                                                            </span>
                                                            {tierAlreadyUnlocked
                                                                ? `${tierMeta.label} Tier`
                                                                : `→ ${tierMeta.label} Tier`}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {Number(pkg.amount).toLocaleString('en-IN')} pts added
                                                </p>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant={
                                                    tierAlreadyUnlocked
                                                        ? 'outline'
                                                        : 'default'
                                                }
                                                className="shrink-0 h-8 text-xs px-3"
                                                onClick={() => {
                                                    if (!user) {
                                                        setCreditsSheetOpen(
                                                            false,
                                                        );
                                                        setLoginOpen(true);
                                                        return;
                                                    }
                                                    setConfirmPkg(pkg);
                                                }}
                                            >
                                                {isUpgrade ? 'Upgrade' : 'Buy'}{' '}
                                                ₹{Number(pkg.amount).toLocaleString('en-IN')}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </SheetContent>
            </Sheet>

            {/* Credit Package Purchase Confirmation */}
            <AlertDialog
                open={!!confirmPkg}
                onOpenChange={(open) => !open && setConfirmPkg(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Purchase</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-2">
                                <p>
                                    Pay{' '}
                                    <strong className="text-foreground">
                                        ₹
                                        {Number(
                                            confirmPkg?.amount,
                                        ).toLocaleString('en-IN')}
                                    </strong>{' '}
                                    to add{' '}
                                    <strong className="text-foreground">
                                        {Number(
                                            confirmPkg?.amount,
                                        ).toLocaleString('en-IN')}{' '}
                                        points
                                    </strong>{' '}
                                    at{' '}
                                    <strong className="text-foreground">
                                        {facility?.name}
                                    </strong>
                                    .
                                </p>
                                <p className="text-xs">
                                    Points never expire and can be used for any
                                    booking at this venue.
                                </p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={purchasing}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmPurchase}
                            disabled={purchasing}
                        >
                            {purchasing
                                ? 'Processing…'
                                : `Pay ₹${Number(confirmPkg?.amount).toLocaleString('en-IN')}`}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default Venues;
