import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ArrowLeft, CalendarDays, Clock, Loader2, MapPin, Wallet } from 'lucide-react';
import {
    initiatePayment,
    verifyBookingPayment,
} from '../../api/adapters/bookings';
import { getWallet } from '../../api/adapters/wallet';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { formatTime } from '../../utils/twMerge';

// ── Types ────────────────────────────────────────────────────────────────────
interface HoldEntry {
    holdId: string;
    bookingDate: string;
    courtName: string;
    slots: Array<{ startTime: string; endTime: string }>;
    totalPrice: number;
    discountAmount: number;
    finalAmount: number;
    createdAt: string;
}

interface MultiConfirmState {
    holds: HoldEntry[];
    venueId: string;
    venueName: string;
    venueAddress: string;
    sport: string;
    latitude?: number | null;
    longitude?: number | null;
}

type PaymentMethod = 'UPI' | 'WALLET';

const HOLD_DURATION_MS = 7 * 60 * 1000;

// ── Component ────────────────────────────────────────────────────────────────
const MultiConfirmBooking = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const state = location.state as MultiConfirmState | null;

    const [secondsLeft, setSecondsLeft] = useState(0);
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('UPI');
    // Track which hold index is currently being paid (for sequential processing)
    const [payingIndex, setPayingIndex] = useState<number | null>(null);
    const [confirmedCount, setConfirmedCount] = useState(0);

    // Use the earliest expiry across all holds
    const earliestCreatedAt = state?.holds
        ? [...state.holds].sort(
              (a, b) =>
                  new Date(a.createdAt).getTime() -
                  new Date(b.createdAt).getTime(),
          )[0]?.createdAt
        : undefined;

    useEffect(() => {
        if (!earliestCreatedAt) return;
        const expiry =
            new Date(earliestCreatedAt).getTime() + HOLD_DURATION_MS;
        const tick = () => {
            const remaining = Math.max(
                0,
                Math.floor((expiry - Date.now()) / 1000),
            );
            setSecondsLeft(remaining);
            if (remaining === 0) {
                toast.error('Hold expired. Please select slots again.');
                navigate(-1);
            }
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [earliestCreatedAt]);

    // Wallet
    const { data: walletData } = useQuery({
        queryKey: ['venueWallet', state?.venueId],
        queryFn: () => getWallet(state!.venueId),
        enabled: !!state?.venueId,
    });
    const walletBalance = Number(walletData?.data?.wallet?.balance ?? 0);

    const grandTotal = state?.holds.reduce(
        (sum, h) => sum + (h.finalAmount ?? h.totalPrice),
        0,
    ) ?? 0;
    const totalDiscount = state?.holds.reduce(
        (sum, h) => sum + (h.discountAmount ?? 0),
        0,
    ) ?? 0;
    const grandSubtotal = state?.holds.reduce(
        (sum, h) => sum + h.totalPrice,
        0,
    ) ?? 0;

    const hasEnoughBalance = walletBalance >= grandTotal;

    // ── Payment — sequential per hold ────────────────────────────────────────
    const processPayments = async () => {
        if (!state) return;
        const bookingRefs: string[] = [];

        for (let i = 0; i < state.holds.length; i++) {
            const hold = state.holds[i];
            setPayingIndex(i);
            try {
                const res = await initiatePayment(hold.holdId, {
                    paymentMethod: selectedMethod,
                });
                const { booking, razorpay } = res.data as any;

                if (selectedMethod === 'WALLET') {
                    bookingRefs.push(booking.bookingRef ?? booking.id);
                    setConfirmedCount((n) => n + 1);
                } else {
                    // Razorpay — open modal and wait for user
                    await new Promise<void>((resolve, reject) => {
                        const rzp = new window.Razorpay({
                            key: razorpay.keyId,
                            amount: razorpay.amount,
                            currency: razorpay.currency,
                            order_id: razorpay.orderId,
                            name: state.venueName,
                            description: `${hold.courtName} — ${hold.slots.length} slot(s)`,
                            handler: async (payment: any) => {
                                try {
                                    await verifyBookingPayment(booking.id, {
                                        razorpayPaymentId:
                                            payment.razorpay_payment_id,
                                        razorpayOrderId:
                                            payment.razorpay_order_id,
                                        razorpaySignature:
                                            payment.razorpay_signature,
                                    });
                                    bookingRefs.push(
                                        booking.bookingRef ?? booking.id,
                                    );
                                    setConfirmedCount((n) => n + 1);
                                    resolve();
                                } catch {
                                    reject(
                                        new Error('Payment verification failed'),
                                    );
                                }
                            },
                            modal: {
                                ondismiss: () =>
                                    reject(new Error('Payment cancelled')),
                            },
                            theme: { color: '#2563eb' },
                        });
                        rzp.open();
                    });
                }
            } catch (err: any) {
                const msg =
                    err?.message ??
                    err?.response?.data?.message ??
                    'Payment failed';
                toast.error(`Booking ${i + 1} of ${state.holds.length}: ${msg}`);
                setPayingIndex(null);
                return;
            }
        }

        setPayingIndex(null);
        toast.success('All bookings confirmed!');
        navigate('/booking-success', {
            replace: true,
            state: {
                bookingRef: bookingRefs[0],
                venueName: state.venueName,
                venueAddress: state.venueAddress,
                venueId: state.venueId,
                sport: state.sport,
                courtName: state.holds.map((h) => h.courtName).join(', '),
                bookingDate: state.holds[0].bookingDate,
                startTime: state.holds[0].slots[0]?.startTime,
                endTime:
                    state.holds[state.holds.length - 1].slots[
                        state.holds[state.holds.length - 1].slots.length - 1
                    ]?.endTime,
                totalPrice: grandTotal,
                latitude: state.latitude,
                longitude: state.longitude,
                multiDates: state.holds.map((h) => h.bookingDate),
                bookingRefs,
            },
        });
    };

    const { mutate: startPayment, isPending: payLoading } = useMutation({
        mutationFn: processPayments,
    });

    // ── Guard ────────────────────────────────────────────────────────────────
    if (!state || !state.holds?.length) {
        return (
            <div className="flex min-h-screen items-center justify-center text-muted-foreground">
                No booking data found.
            </div>
        );
    }

    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    const isExpiringSoon = secondsLeft <= 60;

    return (
        <div className="min-h-screen bg-background pb-32">
            {/* Header */}
            <header className="flex items-center gap-3 bg-primary px-4 pb-4 pt-10 text-primary-foreground">
                <button
                    onClick={() => navigate(-1)}
                    className="rounded-full p-1 hover:bg-primary-foreground/10"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="font-semibold">Confirm Bookings</h1>
                    <p className="text-xs opacity-80">
                        {state.holds.length} dates · {state.venueName}
                    </p>
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
                        All slots held for{' '}
                        <span className="tabular-nums">
                            {mins}:{secs.toString().padStart(2, '0')}
                        </span>{' '}
                        — complete payment before they expire
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
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {state.sport}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Per-date slot cards */}
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
                        Sessions ({state.holds.length} dates)
                    </p>
                    {state.holds.map((hold, idx) => {
                        const startTime = hold.slots[0]?.startTime
                            ? formatTime(hold.slots[0].startTime)
                            : '';
                        const endTime =
                            hold.slots[hold.slots.length - 1]?.endTime
                                ? formatTime(
                                      hold.slots[hold.slots.length - 1].endTime,
                                  )
                                : '';
                        const isConfirmed = idx < confirmedCount;
                        const isProcessing = idx === payingIndex;

                        return (
                            <Card
                                key={hold.holdId}
                                className={
                                    isConfirmed
                                        ? 'border-green-500/50 bg-green-50/30 dark:bg-green-950/10'
                                        : isProcessing
                                          ? 'border-primary/50'
                                          : ''
                                }
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <div className="rounded-full bg-primary/10 p-1.5 shrink-0">
                                                <CalendarDays className="h-3.5 w-3.5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold">
                                                    {format(
                                                        new Date(
                                                            hold.bookingDate,
                                                        ),
                                                        'EEEE, MMM d',
                                                    )}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {hold.courtName} ·{' '}
                                                    {startTime} – {endTime} ·{' '}
                                                    {hold.slots.length} slot
                                                    {hold.slots.length > 1
                                                        ? 's'
                                                        : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            {hold.discountAmount > 0 ? (
                                                <>
                                                    <p className="text-xs text-muted-foreground line-through">
                                                        ₹{hold.totalPrice}
                                                    </p>
                                                    <p className="text-sm font-semibold">
                                                        ₹{hold.finalAmount}
                                                    </p>
                                                </>
                                            ) : (
                                                <p className="text-sm font-semibold">
                                                    ₹{hold.totalPrice}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {isConfirmed && (
                                        <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">
                                            ✓ Confirmed
                                        </p>
                                    )}
                                    {isProcessing && (
                                        <div className="flex items-center gap-1.5 text-xs text-primary mt-2">
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            Processing…
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Price Summary */}
                <Card>
                    <CardContent className="p-4 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Price Summary
                        </p>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                                Subtotal (
                                {state.holds.reduce(
                                    (n, h) => n + h.slots.length,
                                    0,
                                )}{' '}
                                slots)
                            </span>
                            <span>₹{grandSubtotal}</span>
                        </div>
                        {totalDiscount > 0 && (
                            <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                                <span>Tier discount</span>
                                <span className="font-medium">
                                    −₹{totalDiscount}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between border-t pt-2 text-sm font-bold">
                            <span>Total</span>
                            <span>₹{grandTotal}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Payment Method */}
                <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
                        Payment Method
                    </p>
                    <div className="space-y-2">
                        {/* Online / Razorpay */}
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
                        onClick={() => startPayment()}
                        disabled={payLoading || secondsLeft === 0}
                    >
                        {payLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                {payingIndex !== null
                                    ? `Processing ${payingIndex + 1} of ${state.holds.length}…`
                                    : 'Processing…'}
                            </>
                        ) : selectedMethod === 'WALLET' ? (
                            `Pay ₹${grandTotal} from Wallet`
                        ) : (
                            `Pay ₹${grandTotal}`
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default MultiConfirmBooking;
