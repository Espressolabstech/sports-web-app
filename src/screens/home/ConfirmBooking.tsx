import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ArrowLeft, Clock, Loader2, MapPin, Sparkles, Wallet } from 'lucide-react';
import {
    initiatePayment,
    verifyBookingPayment,
    createBooking,
} from '../../api/adapters/bookings';
import { getWallet } from '../../api/adapters/wallet';
import { getPointsWallet } from '../../api/adapters/pointsWallet';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { formatTime } from '../../utils/twMerge';

interface PointsEntry {
    courtId: string;
    bookingDate: string;
    slots: Array<{ startTime: string; endTime: string }>;
    pointsAmount: number;
    courtName: string;
}

interface ConfirmBookingState {
    // Rupee booking fields
    holdId?: string;
    createdAt?: string;
    discountAmount?: number;
    finalAmount?: number;

    // Points booking fields
    paymentMode?: 'POINTS';
    courtId?: string;
    slots?: Array<{ startTime: string; endTime: string }>;
    pointsAmount?: number;
    pointsEntries?: PointsEntry[];    // multi-entry points bookings
    totalPointsAmount?: number;

    // Common fields
    venueId: string;
    venueName: string;
    venueAddress: string;
    sport: string;
    bookingDate?: string;
    courtName?: string;
    totalPrice: number;
    latitude?: number | null;
    longitude?: number | null;
}

type PaymentMethod = 'UPI' | 'WALLET';

const HOLD_DURATION_MS = 7 * 60 * 1000;

// ── Points booking confirm ───────────────────────────────────────────────────
const PointsConfirm = ({
    state,
    navigate,
}: {
    state: ConfirmBookingState;
    navigate: ReturnType<typeof useNavigate>;
}) => {
    const isMulti = !!(state.pointsEntries && state.pointsEntries.length > 0);
    const totalPoints = state.totalPointsAmount ?? state.pointsAmount ?? 0;
    const entries: PointsEntry[] = isMulti
        ? state.pointsEntries!
        : [
              {
                  courtId: state.courtId!,
                  bookingDate: state.bookingDate!,
                  slots: state.slots!,
                  pointsAmount: state.pointsAmount!,
                  courtName: state.courtName!,
              },
          ];

    const { data: walletData, isLoading: walletLoading } = useQuery({
        queryKey: ['pointsWallet', state.venueId],
        queryFn: () => getPointsWallet(state.venueId),
    });
    const pointsBalance = walletData?.data?.wallet?.balance ?? 0;
    const balanceAfter = pointsBalance - totalPoints;
    const hasSufficientPoints = pointsBalance >= totalPoints;

    const [bookLoading, setBookLoading] = useState(false);

    const handleBookWithPoints = async () => {
        setBookLoading(true);
        try {
            const results = await Promise.all(
                entries.map((entry) =>
                    createBooking({
                        courtId: entry.courtId,
                        bookingDate: entry.bookingDate,
                        slots: entry.slots,
                        paymentMode: 'POINTS',
                    }),
                ),
            );
            toast.success('Booking confirmed with points!');
            const first = results[0].data.booking;
            const firstEntry = entries[0];
            navigate('/booking-success', {
                replace: true,
                state: {
                    bookingRef: first.bookingRef ?? first.id,
                    venueName: state.venueName,
                    venueAddress: state.venueAddress,
                    venueId: state.venueId,
                    sport: state.sport,
                    courtName: firstEntry.courtName,
                    bookingDate: firstEntry.bookingDate,
                    startTime: firstEntry.slots[0]?.startTime,
                    endTime: firstEntry.slots[firstEntry.slots.length - 1]?.endTime,
                    totalPrice: 0,
                    paymentMode: 'POINTS',
                    pointsAmount: totalPoints,
                    latitude: state.latitude,
                    longitude: state.longitude,
                },
            });
        } catch (err: any) {
            const msg =
                err?.response?.data?.message ??
                err?.message ??
                'Booking failed. Please try again.';
            toast.error(msg);
        } finally {
            setBookLoading(false);
        }
    };

    const firstEntry = entries[0];
    const formattedDate = firstEntry?.bookingDate
        ? format(new Date(firstEntry.bookingDate), 'EEEE, MMMM d, yyyy')
        : '';
    const startTime = firstEntry?.slots[0]?.startTime
        ? formatTime(firstEntry.slots[0].startTime)
        : '';
    const endTime = firstEntry?.slots[firstEntry.slots.length - 1]?.endTime
        ? formatTime(firstEntry.slots[firstEntry.slots.length - 1].endTime)
        : '';

    return (
        <div className="min-h-screen bg-background pb-28">
            {/* Header */}
            <header className="flex items-center gap-3 bg-primary px-4 pb-4 pt-10 text-primary-foreground">
                <button
                    onClick={() => navigate(-1)}
                    className="rounded-full p-1 hover:bg-primary-foreground/10"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="font-semibold">Confirm Booking</h1>
                    <p className="text-xs opacity-80">{state.venueName}</p>
                </div>
            </header>

            <main className="mx-auto max-w-lg px-4 pt-4 space-y-3">
                {/* Venue */}
                <Card>
                    <CardContent className="p-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                            Venue
                        </p>
                        <div className="flex items-start gap-3">
                            <div className="rounded-full bg-primary/10 p-2 shrink-0">
                                <MapPin className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <p className="font-semibold text-foreground">
                                    {state.venueName}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {state.venueAddress}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Session Details */}
                {!isMulti && (
                    <Card>
                        <CardContent className="p-4 space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Session Details
                            </p>
                            <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="font-medium">{formattedDate}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">
                                    Sport:
                                </span>
                                <span className="font-medium">{state.sport}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">
                                    Court:
                                </span>
                                <span className="font-medium">
                                    {firstEntry?.courtName}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">
                                    Time:
                                </span>
                                <span className="font-medium">
                                    {startTime} – {endTime}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {isMulti && (
                    <Card>
                        <CardContent className="p-4 space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Sessions ({entries.length})
                            </p>
                            {entries.map((e, i) => (
                                <div key={i} className="flex items-center justify-between text-sm border-t pt-2 first:border-0 first:pt-0">
                                    <div>
                                        <p className="font-medium">{e.courtName}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {format(new Date(e.bookingDate), 'dd MMM')}
                                            {' · '}
                                            {formatTime(e.slots[0]?.startTime)} – {formatTime(e.slots[e.slots.length - 1]?.endTime)}
                                        </p>
                                    </div>
                                    <span className="text-xs font-semibold text-primary">
                                        {e.pointsAmount} pts
                                    </span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {/* Points Summary */}
                <Card>
                    <CardContent className="p-4 space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Points Summary
                        </p>
                        {walletLoading ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading balance…
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        Current balance
                                    </span>
                                    <span className="font-semibold">
                                        {pointsBalance.toLocaleString()} pts
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        Cost
                                    </span>
                                    <span className="font-semibold text-destructive">
                                        −{totalPoints.toLocaleString()} pts
                                    </span>
                                </div>
                                <div className="flex items-center justify-between border-t pt-2 text-sm">
                                    <span className="font-semibold text-foreground">
                                        Balance after
                                    </span>
                                    <span
                                        className={`font-bold text-base ${
                                            hasSufficientPoints
                                                ? 'text-foreground'
                                                : 'text-destructive'
                                        }`}
                                    >
                                        {balanceAfter.toLocaleString()} pts
                                    </span>
                                </div>
                                {!hasSufficientPoints && (
                                    <p className="text-xs text-destructive font-medium">
                                        Insufficient points. You need{' '}
                                        {(totalPoints - pointsBalance).toLocaleString()} more pts.
                                    </p>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </main>

            {/* Bottom CTA */}
            <div className="fixed bottom-0 left-0 right-0 bg-background border-t px-4 py-4 z-50">
                <div className="mx-auto max-w-lg">
                    <Button
                        className="w-full gap-2"
                        size="lg"
                        onClick={handleBookWithPoints}
                        disabled={bookLoading || walletLoading || !hasSufficientPoints}
                    >
                        {bookLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Booking…
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4" />
                                Book with {totalPoints.toLocaleString()} pts
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};

// ── Main component ───────────────────────────────────────────────────────────
const ConfirmBooking = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const state = location.state as ConfirmBookingState | null;

    // Points booking path
    if (state?.paymentMode === 'POINTS') {
        return <PointsConfirm state={state} navigate={navigate} />;
    }

    // ── Rupee booking path ───────────────────────────────────────────────────
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('UPI');

    useEffect(() => {
        if (!state?.createdAt) return;
        const expiry = new Date(state.createdAt).getTime() + HOLD_DURATION_MS;
        const tick = () => {
            const remaining = Math.max(
                0,
                Math.floor((expiry - Date.now()) / 1000),
            );
            setSecondsLeft(remaining);
            if (remaining === 0) {
                toast.error('Hold expired. Please select a slot again.');
                navigate(-1);
            }
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [state?.createdAt]);

    // Fetch venue-specific wallet balance
    const { data: walletData } = useQuery({
        queryKey: ['venueWallet', state?.venueId],
        queryFn: () => getWallet(state!.venueId),
        enabled: !!state?.venueId,
    });
    const walletBalance = Number(walletData?.data?.wallet?.balance ?? 0);
    const payableAmount = state?.finalAmount ?? state?.totalPrice ?? 0;
    const hasEnoughBalance = walletBalance >= payableAmount;

    const { mutate: pay, isPending: payLoading } = useMutation({
        mutationFn: () =>
            initiatePayment(state!.holdId!, { paymentMethod: selectedMethod }),
        onSuccess: (res) => {
            const {
                booking,
                razorpay,
            } = res.data as any;

            // Wallet payment confirmed immediately
            if (selectedMethod === 'WALLET') {
                toast.success('Booking confirmed via wallet!');
                navigate('/booking-success', {
                    replace: true,
                    state: {
                        bookingRef: booking.bookingRef ?? booking.id,
                        venueName: state!.venueName,
                        venueAddress: state!.venueAddress,
                        venueId: state!.venueId,
                        sport: state!.sport,
                        courtName: state!.courtName,
                        bookingDate: state!.bookingDate,
                        startTime: state!.slots?.[0]?.startTime,
                        endTime: state!.slots?.[state!.slots!.length - 1]?.endTime,
                        totalPrice: payableAmount,
                        latitude: state!.latitude,
                        longitude: state!.longitude,
                    },
                });
                return;
            }

            // Razorpay flow
            const rzp = new window.Razorpay({
                key: razorpay.keyId,
                amount: razorpay.amount,
                currency: razorpay.currency,
                order_id: razorpay.orderId,
                name: state!.venueName,
                description: `${state!.courtName} — ${state!.slots?.length ?? 0} slot(s)`,
                handler: async (payment: any) => {
                    try {
                        await verifyBookingPayment(booking.id, {
                            razorpayPaymentId: payment.razorpay_payment_id,
                            razorpayOrderId: payment.razorpay_order_id,
                            razorpaySignature: payment.razorpay_signature,
                        });
                        toast.success('Booking confirmed!');
                        navigate('/booking-success', {
                            replace: true,
                            state: {
                                bookingRef: booking.bookingRef ?? booking.id,
                                venueName: state!.venueName,
                                venueAddress: state!.venueAddress,
                                venueId: state!.venueId,
                                sport: state!.sport,
                                courtName: state!.courtName,
                                bookingDate: state!.bookingDate,
                                startTime: state!.slots?.[0]?.startTime,
                                endTime:
                                    state!.slots?.[state!.slots!.length - 1]
                                        ?.endTime,
                                totalPrice: payableAmount,
                                latitude: state!.latitude,
                                longitude: state!.longitude,
                            },
                        });
                    } catch {
                        toast.error('Payment verification failed.');
                    }
                },
                modal: { ondismiss: () => toast.error('Payment cancelled.') },
                theme: { color: '#2563eb' },
            });
            rzp.open();
        },
        onError: (err: any) => {
            const msg =
                err?.message ??
                err?.response?.data?.message ??
                'Failed to initiate payment.';
            toast.error(msg);
            if (msg.toLowerCase().includes('expired')) navigate(-1);
        },
    });

    if (!state) {
        return (
            <div className="flex min-h-screen items-center justify-center text-muted-foreground">
                No booking data found.
            </div>
        );
    }

    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    const isExpiringSoon = secondsLeft <= 60;

    const formattedDate = state.bookingDate
        ? format(new Date(state.bookingDate), 'EEEE, MMMM d, yyyy')
        : '';
    const startTime = state.slots?.[0]?.startTime
        ? formatTime(state.slots[0].startTime)
        : '';
    const endTime = state.slots?.[state.slots.length - 1]?.endTime
        ? formatTime(state.slots[state.slots.length - 1].endTime)
        : '';

    return (
        <div className="min-h-screen bg-background pb-28">
            {/* Header */}
            <header className="flex items-center gap-3 bg-primary px-4 pb-4 pt-10 text-primary-foreground">
                <button
                    onClick={() => navigate(-1)}
                    className="rounded-full p-1 hover:bg-primary-foreground/10"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="font-semibold">Confirm Booking</h1>
                    <p className="text-xs opacity-80">{state.venueName}</p>
                </div>
            </header>

            <main className="mx-auto max-w-lg px-4 pt-4 space-y-3">
                {/* Hold countdown */}
                <div
                    className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium border ${
                        isExpiringSoon
                            ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/20 dark:text-red-400'
                            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400'
                    }`}
                >
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>
                        Slot held for{' '}
                        <span className="tabular-nums">
                            {mins}:{secs.toString().padStart(2, '0')}
                        </span>{' '}
                        — complete payment before it expires
                    </span>
                </div>

                {/* Venue */}
                <Card>
                    <CardContent className="p-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                            Venue
                        </p>
                        <div className="flex items-start gap-3">
                            <div className="rounded-full bg-primary/10 p-2 shrink-0">
                                <MapPin className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <p className="font-semibold text-foreground">
                                    {state.venueName}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {state.venueAddress}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Session Details */}
                <Card>
                    <CardContent className="p-4 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Session Details
                        </p>
                        <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="font-medium">{formattedDate}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">
                                Sport:
                            </span>
                            <span className="font-medium">{state.sport}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Selected Slots */}
                <Card>
                    <CardContent className="p-4 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Selected Slots ({state.slots?.length ?? 0})
                        </p>
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">
                                {state.courtName}{' '}
                                <span className="text-muted-foreground font-normal">
                                    {startTime} – {endTime}
                                </span>
                            </span>
                            {state.discountAmount &&
                            state.discountAmount > 0 ? (
                                <span className="text-muted-foreground line-through text-xs">
                                    ₹{state.totalPrice}
                                </span>
                            ) : (
                                <span className="font-semibold">
                                    ₹{state.totalPrice}
                                </span>
                            )}
                        </div>

                        {state.discountAmount && state.discountAmount > 0 && (
                            <>
                                <div className="flex items-center justify-between text-sm text-green-600 dark:text-green-400">
                                    <span className="flex items-center gap-1.5">
                                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                                        Tier discount
                                    </span>
                                    <span className="font-medium">
                                        −₹{state.discountAmount}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between border-t pt-2 text-sm">
                                    <span className="font-semibold text-foreground">
                                        You pay
                                    </span>
                                    <span className="font-bold text-foreground text-base">
                                        ₹{state.finalAmount ?? state.totalPrice}
                                    </span>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Payment Method */}
                <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
                        Payment Method
                    </p>
                    <div className="space-y-2">
                        {/* UPI / Online */}
                        <button
                            onClick={() => setSelectedMethod('UPI')}
                            className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-colors ${
                                selectedMethod === 'UPI'
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border bg-card'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center shrink-0">
                                    {selectedMethod === 'UPI' && (
                                        <div className="w-2 h-2 rounded-full bg-primary" />
                                    )}
                                </div>
                                <span className="text-sm font-medium">
                                    Online
                                </span>
                            </div>
                            {/* Razorpay logo */}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 720 144"
                                className="h-5 w-auto"
                                aria-label="Razorpay"
                            >
                                <path
                                    d="M46.1 0L0 144h37.5L83.6 0H46.1z"
                                    fill="#072654"
                                />
                                <path
                                    d="M100.5 0L54.4 144h37.5L138 0h-37.5z"
                                    fill="#3395FF"
                                />
                                <path
                                    d="M83.6 0L46.1 144h9.4l37.5-144h-9.4z"
                                    fill="#072654"
                                />
                                <text
                                    x="155"
                                    y="110"
                                    fontFamily="Arial, sans-serif"
                                    fontWeight="700"
                                    fontSize="100"
                                    fill="#072654"
                                >
                                    razorpay
                                </text>
                            </svg>
                        </button>

                        {/* Venue Wallet */}
                        <button
                            onClick={() =>
                                hasEnoughBalance && setSelectedMethod('WALLET')
                            }
                            disabled={!hasEnoughBalance}
                            className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-colors ${
                                selectedMethod === 'WALLET'
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border bg-card'
                            } ${!hasEnoughBalance ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center shrink-0">
                                    {selectedMethod === 'WALLET' && (
                                        <div className="w-2 h-2 rounded-full bg-primary" />
                                    )}
                                </div>
                                <div className="text-left">
                                    <div className="flex items-center gap-1.5">
                                        <Wallet className="h-3.5 w-3.5 text-primary" />
                                        <span className="text-sm font-medium">
                                            Venue Wallet
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Balance: ₹
                                        {walletBalance.toLocaleString('en-IN')}
                                        {!hasEnoughBalance &&
                                            walletBalance > 0 &&
                                            ' — insufficient'}
                                        {walletBalance === 0 && ' — no credits'}
                                    </p>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            </main>

            {/* Bottom CTA */}
            <div className="fixed bottom-0 left-0 right-0 bg-background border-t px-4 py-4 z-50">
                <div className="mx-auto max-w-lg">
                    <Button
                        className="w-full"
                        size="lg"
                        onClick={() => pay()}
                        disabled={payLoading || secondsLeft === 0}
                    >
                        {payLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Processing…
                            </>
                        ) : selectedMethod === 'WALLET' ? (
                            `Pay ₹${payableAmount} from Wallet`
                        ) : (
                            `Pay ₹${payableAmount}`
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmBooking;
