import { createContext, useContext, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPointsWallet } from '../../api/adapters/pointsWallet';
import { getMe } from '../../api/adapters/auth';
import { createBooking } from '../../api/adapters/bookings';
import { getVenueDetail } from '../../api/adapters/venues';
import { type ClubMember, type ClubSlot } from './mock-club';

interface PendingBooking {
    sportId: string;
    date: string;
    slots: ClubSlot[];
    totalCredits: number;
}

interface ConfirmedBooking extends PendingBooking {
    ref: string;
    bookedAt: string;
}

interface ClubCtx {
    slug: string;
    venueId: string;
    brandColor: string;           // resolved CSS hsl() string for inline styles
    monthlyPointsAllowance: number;
    pointPrice: number | null;
    member: ClubMember;
    wallet: ApiPointsWallet | null;
    isLoading: boolean;
    pending: PendingBooking | null;
    setPending: (p: PendingBooking | null) => void;
    lastBooking: ConfirmedBooking | null;
    confirmBooking: () => Promise<ConfirmedBooking | null>;
    refetchWallet: () => void;
}

const DEFAULT_ACCENT = '35 55% 42%';

const Ctx = createContext<ClubCtx | null>(null);

export function ClubProvider({ children }: { children: ReactNode }) {
    const { venueId: slugOrId = '' } = useParams();
    const [pending, setPending] = useState<PendingBooking | null>(null);
    const [lastBooking, setLastBooking] = useState<ConfirmedBooking | null>(null);

    const { data: venueData, isLoading: venueLoading } = useQuery({
        queryKey: ['venue', slugOrId],
        queryFn: () => getVenueDetail(slugOrId),
        enabled: !!slugOrId,
    });
    const realVenueId = venueData?.data?.venue?.id ?? '';
    const monthlyPointsAllowance = venueData?.data?.venue?.monthlyPointsAllowance ?? 0;
    const pointPrice = venueData?.data?.venue?.pointPrice ?? null;
    // brandColor stored as HSL triplet e.g. "35 55% 42%" or full hex — we normalise to hsl()
    const rawBrandColor = venueData?.data?.venue?.brandColor;
    const brandColor = rawBrandColor
        ? (rawBrandColor.startsWith('#') || rawBrandColor.startsWith('rgb')
              ? rawBrandColor
              : `hsl(${rawBrandColor})`)
        : `hsl(${DEFAULT_ACCENT})`;

    const { data: walletData, isLoading: walletLoading, refetch: refetchWallet } = useQuery({
        queryKey: ['points-wallet', realVenueId],
        queryFn: () => getPointsWallet(realVenueId),
        enabled: !!realVenueId,
    });

    const { data: meData, isLoading: meLoading } = useQuery({
        queryKey: ['me'],
        queryFn: getMe,
    });

    const wallet = walletData?.data?.wallet ?? null;
    const user = meData?.data?.user;

    const member: ClubMember = {
        name: user?.name ?? 'Member',
        memberId: user?.id?.slice(0, 8).toUpperCase() ?? '—',
        monthlyAllotment: wallet?.monthlyAllocated ?? 0,
        used: wallet?.monthlyUsed ?? 0,
        renewalDate: '1st of next month',
        phoneMasked: user?.phone
            ? `+${user.countryCode} ••••• •${user.phone.slice(-4)}`
            : '—',
    };

    async function confirmBooking(): Promise<ConfirmedBooking | null> {
        if (!pending) return null;
        const courtId = pending.slots[0].courtId;
        const result = await createBooking({
            courtId,
            bookingDate: pending.date,
            slots: pending.slots.map((s) => ({
                startTime: s.startTime,
                endTime: s.endTime,
            })),
            paymentMode: 'POINTS',
        });
        const booking: ConfirmedBooking = {
            ...pending,
            ref: result.data.booking.bookingRef,
            bookedAt: new Date().toISOString(),
        };
        await refetchWallet();
        setLastBooking(booking);
        setPending(null);
        return booking;
    }

    return (
        <Ctx.Provider
            value={{
                slug: slugOrId,
                venueId: realVenueId,
                brandColor,
                monthlyPointsAllowance,
                pointPrice,
                member,
                wallet,
                isLoading: venueLoading || walletLoading || meLoading,
                pending,
                setPending,
                lastBooking,
                confirmBooking,
                refetchWallet,
            }}
        >
            {children}
        </Ctx.Provider>
    );
}

export function useClub() {
    const v = useContext(Ctx);
    if (!v) throw new Error('useClub must be used inside ClubProvider');
    return v;
}

export function remainingCredits(m: ClubMember) {
    return Math.max(0, m.monthlyAllotment - m.used);
}
