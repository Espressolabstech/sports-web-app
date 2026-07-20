import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getUpcomingBookings,
    getPastBookings,
} from '../../api/adapters/myBookings';
import {
    activateOtc,
    cancelBooking,
    deactivateOtc,
    initiatePayment,
    verifyBookingPayment,
} from '../../api/adapters/bookings';
import { statusColors } from '../../utils/mockData';
import { formatTime } from '../../utils/twMerge';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
    AlertTriangle,
    ArrowLeft,
    Calendar,
    ChevronRight,
    Clock,
    Loader2,
    MapPin,
    Navigation,
    Receipt,
    Share2,
    Shield,
    XCircle,
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../../components/ui/dialog';
import { BottomNav } from '../../components/BottomNav';
import { OtcConfirmationDialog } from '../../components/OtcConfirmationDialog';
import { BookingReceiptModal } from '../../components/BookingReceiptModal';

const HOLD_DURATION_MS = 7 * 60 * 1000;
const OTC_CUTOFF_MS = 2 * 60 * 60 * 1000;

// Open to Cancel closes 2 hours before the session starts.
const getOtcCutoff = (b: ApiBooking) => {
    const sessionStart = new Date(
        `${b.bookingDate.split('T')[0]}T${b.startTime}`,
    );
    return new Date(sessionStart.getTime() - OTC_CUTOFF_MS);
};

const bookingStatusColors: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-800',
    CONFIRMED: 'bg-green-100 text-green-800',
    COMPLETED: 'bg-blue-100 text-blue-800',
    CANCELLED: 'bg-red-100 text-red-800',
    NO_SHOW: 'bg-gray-100 text-gray-600',
    // legacy mock statuses
    confirmed: statusColors.confirmed,
    checked_in: statusColors.checked_in,
    completed: statusColors.completed,
    cancelled: statusColors.cancelled,
};

const getHoldSecondsLeft = (b: ApiBooking) => {
    if (b.status !== 'PENDING') return null;
    const expiry = new Date(b.createdAt).getTime() + HOLD_DURATION_MS;
    return Math.max(0, Math.floor((expiry - Date.now()) / 1000));
};

const isActiveHold = (b: ApiBooking) => {
    const s = getHoldSecondsLeft(b);
    return s !== null && s > 0;
};

const MyBookings = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [otcDialogOpen, setOtcDialogOpen] = useState(false);
    const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
        null,
    );
    const [selectedBooking, setSelectedBooking] = useState<ApiBooking | null>(
        null,
    );
    const [tick, setTick] = useState(0);
    const [payingHoldId, setPayingHoldId] = useState<string | null>(null);
    const payingBookingRef = useRef<ApiBooking | null>(null);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [receiptOpen, setReceiptOpen] = useState(false);

    // Drive per-second countdown for active holds
    useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), 1000);
        return () => clearInterval(id);
    }, []);

    const { data: upcomingData, isLoading: upcomingLoading } = useQuery({
        queryKey: ['bookings', 'upcoming'],
        queryFn: () => getUpcomingBookings(),
    });

    const { data: pastData, isLoading: pastLoading } = useQuery({
        queryKey: ['bookings', 'past'],
        queryFn: () => getPastBookings(),
    });

    const {
        mutate: activateOtcMutation,
        isPending: activateOtcLoading,
    } = useMutation({
        mutationFn: (bookingId: string) => activateOtc(bookingId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            setOtcDialogOpen(false);
            setSelectedBookingId(null);
            toast.success('Your slot is open for another player to book', {
                description:
                    "We'll refund you automatically if someone else books this slot.",
            });
        },
        onError: (err: any) => {
            const msg = err?.message ?? 'Failed to activate Open to Cancel';
            toast.error(msg);
        },
    });

    const { mutate: closeOtc, isPending: closeOtcLoading } = useMutation({
        mutationFn: (bookingId: string) => deactivateOtc(bookingId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            toast.info('Open to Cancel offer closed', {
                description: 'Your booking remains confirmed.',
            });
        },
        onError: (err: any) => {
            const msg = err?.message ?? 'Failed to close the offer';
            toast.error(msg);
        },
    });

    const { mutate: directCancel, isPending: directCancelLoading } =
        useMutation({
            mutationFn: (bookingId: string) =>
                cancelBooking(bookingId, {
                    cancelReason: 'Cancelled by player',
                }),
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['bookings'] });
                setCancelDialogOpen(false);
                setSelectedBooking(null);
                toast.success('Booking cancelled successfully');
            },
            onError: (err: any) => {
                const msg =
                    err?.response?.data?.message ??
                    'Unable to cancel this booking.';
                toast.error(msg);
            },
        });

    const { mutate: payHold } = useMutation({
        mutationFn: (bookingId: string) =>
            initiatePayment(bookingId, { paymentMethod: 'UPI' }),
        onMutate: (bookingId) => setPayingHoldId(bookingId),
        onSettled: () => setPayingHoldId(null),
        onSuccess: (res) => {
            const { booking, razorpay } = res.data;
            const rzp = new window.Razorpay({
                key: razorpay.keyId,
                amount: razorpay.amount,
                currency: razorpay.currency,
                order_id: razorpay.orderId,
                name: 'BookEase',
                handler: async (payment: any) => {
                    try {
                        await verifyBookingPayment(booking.id, {
                            razorpayPaymentId: payment.razorpay_payment_id,
                            razorpayOrderId: payment.razorpay_order_id,
                            razorpaySignature: payment.razorpay_signature,
                        });
                        queryClient.invalidateQueries({ queryKey: ['bookings'] });
                        const b = payingBookingRef.current;
                        navigate('/booking-success', {
                            replace: true,
                            state: {
                                bookingRef: b?.bookingRef ?? booking.bookingRef ?? booking.id,
                                venueName: b?.venue.name ?? '',
                                venueAddress: b ? `${b.venue.address}, ${b.venue.city}` : '',
                                venueId: b?.venue.id ?? '',
                                sport: b?.court.sport ?? '',
                                courtName: b?.court.name ?? '',
                                bookingDate: (b?.bookingDate ?? '').split('T')[0],
                                startTime: b?.startTime ?? '',
                                endTime: b?.endTime ?? '',
                                totalPrice: b?.finalAmount ?? 0,
                            },
                        });
                    } catch {
                        toast.error('Payment verification failed.');
                        queryClient.invalidateQueries({ queryKey: ['bookings'] });
                    }
                },
                modal: {
                    ondismiss: () => {
                        cancelBooking(booking.id).catch(() => {});
                        toast.error('Payment cancelled.');
                        queryClient.invalidateQueries({
                            queryKey: ['bookings'],
                        });
                    },
                },
                theme: { color: '#2563eb' },
            });
            rzp.open();
        },
        onError: (err: any) => {
            const msg =
                err?.response?.data?.message ?? 'Failed to initiate payment.';
            toast.error(msg);
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
        },
    });

    // tick drives per-second re-render so hold countdowns stay fresh
    const allUpcoming = [...(upcomingData?.data?.bookings ?? [])].filter(
        (b) => {
            if (b.status !== 'PENDING') return true;
            // hide expired holds (use tick so this re-evaluates every second)
            return tick >= 0 && isActiveHold(b);
        },
    );

    const upcomingBookings = allUpcoming.sort((a, b) =>
        `${a.bookingDate}${a.startTime}`.localeCompare(
            `${b.bookingDate}${b.startTime}`,
        ),
    );

    const pastBookings = [...(pastData?.data?.bookings ?? [])].sort((a, b) =>
        `${b.bookingDate}${b.startTime}`.localeCompare(
            `${a.bookingDate}${a.startTime}`,
        ),
    );

    const isOtcEligible = (booking: ApiBooking) => {
        if (booking.status !== 'CONFIRMED') return false;
        if (booking.isOtcActive) return false;
        return Date.now() < getOtcCutoff(booking).getTime();
    };

    // Whether an active OTC offer is still open (before cutoff) vs. closed
    // without a taker (past cutoff, booking simply remains confirmed).
    const isOtcOfferOpen = (booking: ApiBooking) =>
        booking.isOtcActive && Date.now() < getOtcCutoff(booking).getTime();

    const handleActivateOtc = () => {
        if (!selectedBookingId) return;
        activateOtcMutation(selectedBookingId);
    };

    const handleShare = async (b: ApiBooking) => {
        const formattedDate = format(
            new Date(b.bookingDate),
            'EEEE, d MMMM yyyy',
        );
        const timeRange = `${formatTime(b.startTime)} – ${formatTime(b.endTime)}`;
        const mapsLink = `https://maps.google.com/?q=${encodeURIComponent(`${b.venue.name} ${b.venue.city ?? ''}`)}`;

        const lines = [
            `🎉 Just booked a court at ${b.venue.name}!`,
            ``,
            `Venue: ${b.venue.name}`,
            `Sport: ${b.court.sport}`,
            `Court: ${b.court.name}`,
            `Date: ${formattedDate}`,
            `Time: ${timeRange}`,
            `Booking Ref: ${b.bookingRef}`,
            ``,
            `📍 ${b.venue.city ?? ''}`,
            `Directions: ${mapsLink}`,
            ``,
            `See you on the court! 🏆`,
        ];
        const text = lines.join('\n');

        if (navigator.share) {
            try {
                await navigator.share({ title: '🎉 My Booking', text });
            } catch {
                // user cancelled — ignore
            }
        } else {
            await navigator.clipboard.writeText(text);
        }
    };

    const renderOtcStatusCard = (booking: ApiBooking) => {
        if (isOtcOfferOpen(booking)) {
            const msLeft = getOtcCutoff(booking).getTime() - Date.now();
            const totalSecs = Math.max(0, Math.floor(msLeft / 1000));
            const hh = Math.floor(totalSecs / 3600);
            const mm = Math.floor((totalSecs % 3600) / 60);
            const ss = totalSecs % 60;
            const countdown =
                hh > 0
                    ? `${hh}h ${mm}m`
                    : `${mm}:${ss.toString().padStart(2, '0')}`;

            return (
                <div className="space-y-2 rounded-lg border border-warning/40 bg-warning/5 p-3">
                    <p className="text-sm font-medium text-foreground">
                        Your slot is open for another player to book
                    </p>
                    <p className="text-xs text-muted-foreground">
                        If someone books your court before the cutoff, your
                        full payment will be returned to your wallet
                        automatically.
                    </p>
                    <p className="flex items-center gap-1.5 text-xs font-medium text-warning">
                        <Clock className="h-3.5 w-3.5" />
                        Closes in {countdown} · {booking.court.name} ·{' '}
                        {format(new Date(booking.bookingDate), 'MMM d')}{' '}
                        {formatTime(booking.startTime)}
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs border-warning/40 text-warning hover:bg-warning/10"
                        onClick={() => closeOtc(booking.id)}
                        disabled={closeOtcLoading}
                    >
                        {closeOtcLoading && (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        )}
                        Close this offer
                    </Button>
                </div>
            );
        }

        if (booking.isOtcActive) {
            // Cutoff has passed and nobody claimed the slot
            return (
                <div className="space-y-1 rounded-lg border bg-muted/40 p-3">
                    <p className="text-sm font-medium text-foreground">
                        No one booked your slot
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Your booking is confirmed. See you on court.
                    </p>
                </div>
            );
        }

        if (isOtcEligible(booking)) {
            return (
                <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                        setSelectedBookingId(booking.id);
                        setOtcDialogOpen(true);
                    }}
                >
                    <Shield className="h-4 w-4 mr-2" />
                    Open to Cancel
                </Button>
            );
        }

        return null;
    };

    // Detail overlay
    if (selectedBooking) {
        return (
            <div className="min-h-screen bg-background pb-20">
                <header className="flex items-center gap-3 bg-[linear-gradient(90deg,rgba(38,117,148,1)_0%,rgba(16,45,69,1)_70%)] px-4 pb-4 pt-10 text-primary-foreground">
                    <button
                        onClick={() => setSelectedBooking(null)}
                        className="rounded-full p-1 hover:bg-primary-foreground/10"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <h1 className="flex-1 font-semibold">Booking Details</h1>
                </header>
                <main className="mx-auto max-w-lg space-y-4 px-4 pt-4">
                    <Card className="overflow-hidden border-primary/20">
                        <CardContent className="p-5 space-y-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-lg font-bold text-foreground">
                                        {selectedBooking.court.name}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {selectedBooking.venue.name}
                                    </p>
                                </div>
                                <Badge
                                    className={
                                        bookingStatusColors[
                                            selectedBooking.status
                                        ] ?? ''
                                    }
                                >
                                    {selectedBooking.status.replace(/_/g, ' ')}
                                </Badge>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-foreground">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    {format(
                                        new Date(selectedBooking.bookingDate),
                                        'EEEE, MMMM d, yyyy',
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-foreground">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    {formatTime(selectedBooking.startTime)} –{' '}
                                    {formatTime(selectedBooking.endTime)}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-foreground">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    {selectedBooking.venue.address},{' '}
                                    {selectedBooking.venue.city}
                                </div>
                            </div>
                            <div className="border-t pt-3 space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                        Amount
                                    </span>
                                    <span>₹{selectedBooking.totalAmount}</span>
                                </div>
                                {selectedBooking.discountAmount > 0 && (
                                    <div className="flex justify-between text-green-600">
                                        <span>Discount</span>
                                        <span>
                                            -₹{selectedBooking.discountAmount}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between font-semibold pt-1 border-t">
                                    <span>Total Paid</span>
                                    <span>₹{selectedBooking.finalAmount}</span>
                                </div>
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Payment</span>
                                    <span>
                                        {selectedBooking.payment.paymentMethod}{' '}
                                        ·{' '}
                                        {selectedBooking.payment.paymentStatus}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() =>
                                window.open(
                                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedBooking.venue.name + ' ' + selectedBooking.venue.city)}`,
                                    '_blank',
                                )
                            }
                        >
                            <Navigation className="h-4 w-4 mr-2" /> Directions
                        </Button>
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleShare(selectedBooking)}
                        >
                            <Share2 className="h-4 w-4 mr-2" /> Share
                        </Button>
                    </div>

                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setReceiptOpen(true)}
                    >
                        <Receipt className="h-4 w-4 mr-2" /> View Receipt
                    </Button>

                    {selectedBooking.status === 'CONFIRMED' && (
                        <>
                            {renderOtcStatusCard(selectedBooking)}

                            <Button
                                variant="outline"
                                className="w-full border-destructive/40 text-destructive hover:bg-destructive/5"
                                onClick={() => setCancelDialogOpen(true)}
                            >
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancel Booking
                            </Button>
                        </>
                    )}
                </main>

                {/* Cancel confirmation dialog */}
                <Dialog
                    open={cancelDialogOpen}
                    onOpenChange={setCancelDialogOpen}
                >
                    <DialogContent className="max-w-sm">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                                Cancel Booking?
                            </DialogTitle>
                            <DialogDescription>
                                You are cancelling your booking for{' '}
                                <span className="font-medium text-foreground">
                                    {selectedBooking.court.name}
                                </span>{' '}
                                at{' '}
                                <span className="font-medium text-foreground">
                                    {selectedBooking.venue.name}
                                </span>{' '}
                                on{' '}
                                {format(
                                    new Date(selectedBooking.bookingDate),
                                    'EEE, MMM d',
                                )}
                                . Refunds are subject to the venue's
                                cancellation policy.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                variant="outline"
                                onClick={() => setCancelDialogOpen(false)}
                                disabled={directCancelLoading}
                            >
                                Keep Booking
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={() => directCancel(selectedBooking.id)}
                                disabled={directCancelLoading}
                            >
                                {directCancelLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : null}
                                Yes, Cancel
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <BottomNav />

                <BookingReceiptModal
                    open={receiptOpen}
                    onClose={() => setReceiptOpen(false)}
                    data={{
                        bookingRef: selectedBooking.bookingRef,
                        venueName: selectedBooking.venue.name,
                        venueAddress: `${selectedBooking.venue.address}, ${selectedBooking.venue.city}`,
                        sport: selectedBooking.court.sport,
                        courtName: selectedBooking.court.name,
                        bookingDate: selectedBooking.bookingDate.split('T')[0],
                        startTime: selectedBooking.startTime,
                        endTime: selectedBooking.endTime,
                        durationMinutes: selectedBooking.durationMinutes,
                        totalAmount: selectedBooking.totalAmount,
                        discountAmount: selectedBooking.discountAmount,
                        finalAmount: selectedBooking.finalAmount,
                        paymentMethod: selectedBooking.payment?.paymentMethod,
                        paymentStatus: selectedBooking.payment?.paymentStatus,
                        bookedAt: selectedBooking.createdAt,
                    }}
                />
            </div>
        );
    }

    const renderBookingCard = (b: ApiBooking, isUpcomingCard: boolean) => {
        const otcOfferOpen = isOtcOfferOpen(b);
        const holdSecs = getHoldSecondsLeft(b);
        const isPendingHold = holdSecs !== null && holdSecs > 0;
        const holdMins = holdSecs !== null ? Math.floor(holdSecs / 60) : 0;
        const holdSecsRem = holdSecs !== null ? holdSecs % 60 : 0;

        return (
            <Card
                key={b.id}
                className={`cursor-pointer hover:shadow-md transition-shadow ${!isUpcomingCard ? 'opacity-80' : ''} ${isPendingHold ? 'border-amber-300' : ''}`}
                onClick={() => !isPendingHold && setSelectedBooking(b)}
            >
                <CardContent className="p-4">
                    <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="font-semibold text-foreground">
                                        {b.court.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {b.venue.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {format(
                                            new Date(b.bookingDate),
                                            isUpcomingCard
                                                ? 'EEEE, MMM d'
                                                : 'MMM d, yyyy',
                                        )}{' '}
                                        · {formatTime(b.startTime)} –{' '}
                                        {formatTime(b.endTime)}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <Badge
                                        className={
                                            bookingStatusColors[b.status] ?? ''
                                        }
                                    >
                                        {isPendingHold
                                            ? 'Held'
                                            : b.status.replace(/_/g, ' ')}
                                    </Badge>
                                    {otcOfferOpen && (
                                        <Badge className="bg-warning/10 text-warning text-[10px]">
                                            Open to Cancel
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            <div className="mt-2 flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                    Total
                                </span>
                                <span className="font-medium">
                                    ₹{b.finalAmount}
                                </span>
                            </div>

                            {isPendingHold && (
                                <div
                                    className="mt-3 flex items-center gap-2"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="flex items-center gap-1 text-xs text-amber-600 flex-1">
                                        <Clock className="h-3.5 w-3.5" />
                                        <span className="tabular-nums">
                                            {holdMins}:
                                            {holdSecsRem
                                                .toString()
                                                .padStart(2, '0')}{' '}
                                            to pay
                                        </span>
                                    </div>
                                    <Button
                                        size="sm"
                                        className="text-xs"
                                        disabled={payingHoldId === b.id}
                                        onClick={() => {
                                            payingBookingRef.current = b;
                                            payHold(b.id);
                                        }}
                                    >
                                        {payingHoldId === b.id ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            'Pay Now'
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>

                        {!isPendingHold && (
                            <ChevronRight className="mt-1 h-5 w-5 shrink-0 self-center text-muted-foreground" />
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    };

    const isLoading = upcomingLoading || pastLoading;

    return (
        <div className="min-h-screen bg-background pb-20">
            <header className="bg-[linear-gradient(90deg,rgba(38,117,148,1)_0%,rgba(16,45,69,1)_70%)] px-4 pb-4 pt-10 text-primary-foreground">
                <h1 className="text-xl font-bold">My Bookings</h1>
            </header>

            <main className="mx-auto max-w-lg space-y-6 px-4 pt-4">
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="h-24 animate-pulse rounded-xl bg-muted"
                            />
                        ))}
                    </div>
                ) : (
                    <>
                        {/* Upcoming */}
                        <div>
                            <h2 className="text-lg font-bold text-foreground mb-3">
                                Upcoming
                            </h2>
                            {upcomingBookings.length > 0 ? (
                                <div className="space-y-2">
                                    {upcomingBookings.map((b) =>
                                        renderBookingCard(b, true),
                                    )}
                                </div>
                            ) : (
                                <Card>
                                    <CardContent className="p-6 text-center">
                                        <p className="text-muted-foreground">
                                            No upcoming bookings
                                        </p>
                                        <Button
                                            variant="outline"
                                            className="mt-3"
                                            onClick={() => navigate('/')}
                                        >
                                            Book a Court
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Past */}
                        {pastBookings.length > 0 && (
                            <div>
                                <h2 className="text-lg font-bold text-foreground mb-3">
                                    Past Bookings
                                </h2>
                                <div className="space-y-2">
                                    {pastBookings.map((b) =>
                                        renderBookingCard(b, false),
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>

            <OtcConfirmationDialog
                open={otcDialogOpen}
                onOpenChange={setOtcDialogOpen}
                venueName={
                    selectedBookingId
                        ? upcomingBookings.find(
                              (b) => b.id === selectedBookingId,
                          )?.venue.name || 'this venue'
                        : 'this venue'
                }
                onConfirm={handleActivateOtc}
                loading={activateOtcLoading}
            />

            <BottomNav />
        </div>
    );
};

export default MyBookings;
