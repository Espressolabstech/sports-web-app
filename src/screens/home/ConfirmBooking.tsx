import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ArrowLeft, Clock, Loader2, MapPin, Wallet } from 'lucide-react';
import {
    initiatePayment,
    verifyBookingPayment,
} from '../../api/adapters/bookings';
import { getWallet } from '../../api/adapters/wallet';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { formatTime } from '../../utils/twMerge';

interface ConfirmBookingState {
    holdId: string;
    venueId: string;
    venueName: string;
    venueAddress: string;
    sport: string;
    bookingDate: string;
    courtName: string;
    slots: Array<{ startTime: string; endTime: string }>;
    totalPrice: number;
    discountAmount?: number;
    finalAmount?: number;
    createdAt: string;
    latitude?: number | null;
    longitude?: number | null;
}

type PaymentMethod = 'UPI' | 'WALLET';

const HOLD_DURATION_MS = 7 * 60 * 1000;

const ConfirmBooking = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const state = location.state as ConfirmBookingState | null;

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
            initiatePayment(state!.holdId, { paymentMethod: selectedMethod }),
        onSuccess: (res) => {
            const {
                booking,
                razorpay,
                walletBalance: newBalance,
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
                        startTime: state!.slots[0]?.startTime,
                        endTime: state!.slots[state!.slots.length - 1]?.endTime,
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
                description: `${state!.courtName} — ${state!.slots.length} slot(s)`,
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
                                startTime: state!.slots[0]?.startTime,
                                endTime:
                                    state!.slots[state!.slots.length - 1]
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

    const formattedDate = format(
        new Date(state.bookingDate),
        'EEEE, MMMM d, yyyy',
    );
    const startTime = state.slots[0]?.startTime
        ? formatTime(state.slots[0].startTime)
        : '';
    const endTime = state.slots[state.slots.length - 1]?.endTime
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
                            Selected Slots ({state.slots.length})
                        </p>
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">
                                {state.courtName}{' '}
                                <span className="text-muted-foreground font-normal">
                                    {startTime} – {endTime}
                                </span>
                            </span>
                            {state.discountAmount && state.discountAmount > 0 ? (
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
                                    <span className="font-medium">−₹{state.discountAmount}</span>
                                </div>
                                <div className="flex items-center justify-between border-t pt-2 text-sm">
                                    <span className="font-semibold text-foreground">You pay</span>
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
