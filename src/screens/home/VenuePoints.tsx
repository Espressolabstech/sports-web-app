import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Crown, Shield, Star } from 'lucide-react';
import { getVenueDetail } from '../../api/adapters/venues';
import { getVenueTier } from '../../api/adapters/tier';
import { getWallet } from '../../api/adapters/wallet';
import { getMe } from '../../api/adapters/auth';
import { getToken } from '../../utils/cookies.helpers';
import {
    ALL_PERKS,
    TIER_META,
    TIER_ORDER,
    TIER_PERK_KEYS,
} from '../../utils/tierMeta';
import { PhoneLoginModal } from '../../components/PhoneLoginModal';
import { AnimatedLoader } from '../../components/AnimatedLoader';

const TIER_CARD_STYLES: Record<
    string,
    { chip: string; ring: string; grad: string }
> = {
    club: {
        chip: 'bg-white/15 text-white',
        ring: 'ring-white/10',
        grad: 'from-slate-800 via-slate-900 to-slate-950',
    },
    pro: {
        chip: 'bg-sky-300/20 text-sky-100 ring-1 ring-sky-200/30',
        ring: 'ring-sky-300/20',
        grad: 'from-indigo-900 via-slate-900 to-slate-950',
    },
    elite: {
        chip: 'bg-amber-300/25 text-amber-100 ring-1 ring-amber-200/40',
        ring: 'ring-amber-300/30',
        grad: 'from-amber-700 via-amber-900 to-slate-950',
    },
};

const TIER_ICONS: Record<string, React.ElementType> = {
    club: Shield,
    pro: Star,
    elite: Crown,
};

export default function VenuePoints() {
    const { venueId } = useParams();
    const navigate = useNavigate();
    const user = !!getToken();
    const [loginOpen, setLoginOpen] = useState(false);

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

    const { data: profileData } = useQuery({
        queryKey: ['me'],
        queryFn: getMe,
        enabled: !!user,
    });

    const facility = venueData?.data?.venue;
    const membership = venueData?.data?.membership;
    const walletBalance = Number(walletData?.data?.wallet?.balance ?? 0);
    const tierConfigs: ApiTierConfig[] = tierData?.data?.tier_configs ?? [];
    const displayName = profileData?.data?.user?.name || 'Guest';

    const currentTierName = (membership?.tier ?? 'CLUB').toLowerCase();
    const currentTierIndex = Math.max(0, TIER_ORDER.indexOf(currentTierName));
    const meta = TIER_META[currentTierName] ?? TIER_META.club;
    const cardStyle = TIER_CARD_STYLES[currentTierName] ?? TIER_CARD_STYLES.club;

    const nextTierName =
        currentTierIndex < TIER_ORDER.length - 1
            ? TIER_ORDER[currentTierIndex + 1]
            : null;
    const nextTierMeta = nextTierName ? TIER_META[nextTierName] : null;

    const totalSpend = membership?.totalSpend ?? 0;
    const eliteThreshold =
        tierConfigs.find((c) => c.tier_name === 'elite')?.min_spend || 1;
    const progressPct = Math.min(100, (totalSpend / eliteThreshold) * 100);
    const remainingSpend = membership?.tierProgress?.remainingSpend ?? 0;

    if (venueLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <AnimatedLoader label="Loading…" />
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

    return (
        <div className="min-h-screen bg-background pb-16">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm border-b">
                <div className="mx-auto max-w-lg px-4 py-3 flex items-center gap-3">
                    <button
                        onClick={() => navigate(`/venue/${venueId}`)}
                        className="rounded-full hover:bg-accent p-1.5 -ml-1.5 transition-colors"
                        aria-label="Back to venue"
                    >
                        <ArrowLeft className="h-5 w-5 text-foreground" />
                    </button>
                    <div className="min-w-0">
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                            Membership
                        </p>
                        <h1 className="text-base font-bold text-foreground truncate">
                            {facility.name}
                        </h1>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-lg px-4 pt-6 space-y-12">
                {/* Membership card */}
                <section
                    className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${cardStyle.grad} p-6 shadow-xl ring-1 ${cardStyle.ring} aspect-[1.6/1] flex flex-col justify-between text-white`}
                >
                    <div className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/5 blur-3xl" />

                    <div className="relative flex items-start justify-between">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
                            Member Card
                        </p>
                        <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${cardStyle.chip}`}
                        >
                            <span className="[&>svg]:h-3 [&>svg]:w-3">
                                {meta.icon}
                            </span>
                            {meta.label}
                        </span>
                    </div>

                    <div className="relative">
                        <p className="text-xl font-bold tracking-wide">
                            {user ? displayName : 'Guest'}
                        </p>
                        <p className="text-[11px] uppercase tracking-wider text-white/60 mt-0.5 truncate">
                            {facility.name}
                        </p>
                        <div className="mt-3 flex items-end justify-between">
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-white/50">
                                    Points
                                </p>
                                <p className="text-3xl font-bold tabular-nums leading-none mt-1">
                                    {walletBalance.toLocaleString('en-IN')}
                                </p>
                            </div>
                            <p className="text-[10px] uppercase tracking-wider text-white/40">
                                Valid at this venue
                            </p>
                        </div>
                    </div>
                </section>

                {/* Progress */}
                <section>
                    <div className="text-center mb-8 space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            Your Journey
                        </p>
                        <h2 className="text-2xl font-semibold text-foreground tracking-tight">
                            {!user
                                ? 'Play. Level up. Unlock more.'
                                : nextTierMeta
                                  ? `₹${remainingSpend.toLocaleString('en-IN')} more to ${nextTierMeta.label}`
                                  : "You've reached the top tier"}
                        </h2>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                            {!user
                                ? 'Every booking at this venue counts toward your tier.'
                                : nextTierMeta
                                  ? `Keep booking to unlock ${nextTierMeta.label} benefits.`
                                  : "You're enjoying every perk available at this venue."}
                        </p>
                        <p className="text-xs text-muted-foreground/80 max-w-sm mx-auto leading-relaxed">
                            Tiers are based on how much you spend at this
                            venue — separate from the points balance above.
                            Buying a points package can instantly fast-track
                            you to a higher tier.
                        </p>
                    </div>

                    {/* Rail with 3 milestones */}
                    <div className="relative px-2 pt-2 pb-1">
                        <div
                            className="absolute top-[22px] h-[3px]"
                            style={{ left: `${100 / 6}%`, right: `${100 / 6}%` }}
                        >
                            <div className="absolute inset-0 rounded-full bg-muted" />
                            <div
                                className="absolute left-0 top-0 h-full rounded-full bg-foreground transition-all duration-700"
                                style={{ width: `${user ? progressPct : 0}%` }}
                            />
                        </div>
                        <div className="relative flex justify-between">
                            {TIER_ORDER.map((t, i) => {
                                const tm = TIER_META[t];
                                const reached = user && currentTierIndex >= i;
                                const isCurrent = user && t === currentTierName;
                                const TierIcon = TIER_ICONS[t];
                                return (
                                    <div
                                        key={t}
                                        className="flex flex-col items-center gap-2 w-1/3"
                                    >
                                        <div
                                            className={`h-11 w-11 rounded-full flex items-center justify-center border-2 transition-colors ${
                                                reached
                                                    ? 'bg-foreground border-foreground text-background'
                                                    : 'bg-background border-muted text-muted-foreground'
                                            } ${isCurrent ? 'ring-4 ring-foreground/10' : ''}`}
                                        >
                                            <TierIcon
                                                className="h-5 w-5"
                                                strokeWidth={2}
                                            />
                                        </div>
                                        <p
                                            className={`text-sm font-semibold ${
                                                reached
                                                    ? 'text-foreground'
                                                    : 'text-muted-foreground'
                                            }`}
                                        >
                                            {tm.label}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* Per-tier benefit breakdown */}
                <section className="space-y-4">
                    <div className="text-center">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            What you unlock
                        </p>
                    </div>

                    <div className="space-y-3">
                        {TIER_ORDER.map((t, i) => {
                            const tm = TIER_META[t];
                            const perkKeys = TIER_PERK_KEYS[t];
                            const prevKeys =
                                i === 0 ? [] : TIER_PERK_KEYS[TIER_ORDER[i - 1]];
                            const newKeys = perkKeys.filter(
                                (k) => !prevKeys.includes(k),
                            );
                            const newPerks = newKeys.map(
                                (k) => ALL_PERKS.find((p) => p.key === k)!,
                            );
                            const isCurrent = user && t === currentTierName;
                            const reached = user && currentTierIndex >= i;
                            const config = tierConfigs.find(
                                (c) => c.tier_name === t,
                            );

                            return (
                                <div
                                    key={t}
                                    className={`rounded-2xl border bg-card p-5 transition-shadow ${
                                        isCurrent
                                            ? 'border-foreground/40 shadow-sm'
                                            : 'border-border'
                                    }`}
                                >
                                    <div className="flex items-baseline justify-between mb-4">
                                        <div className="flex items-baseline gap-2">
                                            <h3 className="text-base font-semibold text-foreground">
                                                {tm.label}
                                            </h3>
                                            {isCurrent && (
                                                <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/70">
                                                    · You're here
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground tabular-nums">
                                            {!config || config.min_spend === 0
                                                ? 'Starting tier'
                                                : `Unlock at ₹${config.min_spend.toLocaleString('en-IN')} spend`}
                                        </p>
                                    </div>

                                    <ul className="space-y-3">
                                        {i > 0 && (
                                            <li className="text-xs text-muted-foreground italic">
                                                Everything in{' '}
                                                {TIER_META[TIER_ORDER[i - 1]].label},
                                                plus:
                                            </li>
                                        )}
                                        {newPerks.map((perk) => (
                                            <li
                                                key={perk.key}
                                                className="flex items-start gap-3"
                                            >
                                                <div
                                                    className={`rounded-lg p-2 shrink-0 ${
                                                        reached
                                                            ? 'bg-primary/10 text-primary'
                                                            : 'bg-muted text-muted-foreground'
                                                    }`}
                                                >
                                                    {perk.icon}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-foreground">
                                                        {perk.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                                                        {perk.description}
                                                    </p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {!user && (
                    <button
                        onClick={() => setLoginOpen(true)}
                        className="w-full rounded-2xl bg-primary text-primary-foreground font-semibold py-3.5 text-sm"
                    >
                        Log in to start earning
                    </button>
                )}
            </div>

            <PhoneLoginModal open={loginOpen} onOpenChange={setLoginOpen} />
        </div>
    );
}
