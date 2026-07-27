import { Crown, Lock, Percent, Shield, Star, Unlock, Zap } from 'lucide-react';

// ── Tier Metadata ──────────────────────────────────────────────────────────────
export const TIER_META: Record<
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

export const TIER_ORDER = ['club', 'pro', 'elite'];

export const ALL_PERKS: TierPerkInfo[] = [
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

export const TIER_PERK_KEYS: Record<string, string[]> = {
    club: ['otc', 'rental_discount'],
    pro: ['otc', 'rental_discount', 'hold'],
    elite: ['otc', 'rental_discount', 'hold', 'early'],
};

export const TIER_PERKS: Record<string, TierPerkInfo[]> = Object.fromEntries(
    Object.entries(TIER_PERK_KEYS).map(([tier, keys]) => [
        tier,
        keys.map((k) => ALL_PERKS.find((p) => p.key === k)!),
    ]),
);
