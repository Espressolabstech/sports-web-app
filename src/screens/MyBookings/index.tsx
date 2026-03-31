import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUpcomingBookings, getPastBookings } from '../../api/adapters/myBookings';
import { cancelBooking } from '../../api/adapters/bookings';
import { statusColors } from '../../utils/mockData';
import { differenceInHours, format } from 'date-fns';
import { toast } from 'sonner';
import {
    ArrowLeft,
    Calendar,
    Clock,
    MapPin,
    Navigation,
    Share2,
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { BottomNav } from '../../components/BottomNav';
import { OtcConfirmationDialog } from '../../components/OtcConfirmationDialog';

const bookingStatusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
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

const isUpcoming = (b: ApiBooking) =>
    b.status === 'PENDING' || b.status === 'CONFIRMED';

const MyBookings = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [otcDialogOpen, setOtcDialogOpen] = useState(false);
    const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
    const [selectedBooking, setSelectedBooking] = useState<ApiBooking | null>(null);
    const [otcActiveBookings, setOtcActiveBookings] = useState<Set<string>>(new Set());

    const { data: upcomingData, isLoading: upcomingLoading } = useQuery({
        queryKey: ['bookings', 'upcoming'],
        queryFn: () => getUpcomingBookings(),
    });

    const { data: pastData, isLoading: pastLoading } = useQuery({
        queryKey: ['bookings', 'past'],
        queryFn: () => getPastBookings(),
    });

    const { mutate: cancel, isPending: cancelLoading } = useMutation({
        mutationFn: (bookingId: string) => cancelBooking(bookingId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            setOtcDialogOpen(false);
            setSelectedBookingId(null);
            toast.success('Open to Cancel activated', {
                description: "We'll refund you automatically if someone else books this slot.",
            });
        },
        onError: () => toast.error('Failed to activate Open to Cancel'),
    });

    const upcomingBookings = [...(upcomingData?.data?.bookings ?? [])].sort((a, b) =>
        `${a.bookingDate}${a.startTime}`.localeCompare(`${b.bookingDate}${b.startTime}`),
    );

    const pastBookings = [...(pastData?.data?.bookings ?? [])].sort((a, b) =>
        `${b.bookingDate}${b.startTime}`.localeCompare(`${a.bookingDate}${a.startTime}`),
    );

    const isOtcEligible = (booking: ApiBooking) => {
        if (booking.status !== 'CONFIRMED') return false;
        if (otcActiveBookings.has(booking.id)) return false;
        const sessionStart = new Date(`${booking.bookingDate.split('T')[0]}T${booking.startTime}`);
        if (differenceInHours(sessionStart, new Date()) <= 1) return false;
        return true;
    };

    const handleActivateOtc = () => {
        if (!selectedBookingId) return;
        cancel(selectedBookingId);
    };

    const handleCancelOtc = (bookingId: string) => {
        setOtcActiveBookings((prev) => {
            const next = new Set(prev);
            next.delete(bookingId);
            return next;
        });
        toast.info('Open to Cancel deactivated', {
            description: 'Your booking remains confirmed.',
        });
    };

    const handleShare = async (b: ApiBooking) => {
        const text = `${b.venue.name} — ${b.court.name}\n${format(new Date(b.bookingDate), 'EEEE, MMM d yyyy')} · ${b.startTime} – ${b.endTime}`;
        if (navigator.share) {
            await navigator.share({ title: 'My Booking', text });
        } else {
            await navigator.clipboard.writeText(text);
        }
    };

    // Detail overlay
    if (selectedBooking) {
        return (
            <div className="min-h-screen bg-background pb-20">
                <header className="flex items-center gap-3 bg-primary px-4 pb-4 pt-10 text-primary-foreground">
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
                                        bookingStatusColors[selectedBooking.status] ?? ''
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
                                    {selectedBooking.startTime} – {selectedBooking.endTime}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-foreground">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    {selectedBooking.venue.address}, {selectedBooking.venue.city}
                                </div>
                            </div>
                            <div className="border-t pt-3 space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Amount</span>
                                    <span>₹{selectedBooking.totalAmount}</span>
                                </div>
                                {selectedBooking.discountAmount > 0 && (
                                    <div className="flex justify-between text-green-600">
                                        <span>Discount</span>
                                        <span>-₹{selectedBooking.discountAmount}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-semibold pt-1 border-t">
                                    <span>Total Paid</span>
                                    <span>₹{selectedBooking.finalAmount}</span>
                                </div>
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Payment</span>
                                    <span>{selectedBooking.payment.paymentMethod} · {selectedBooking.payment.paymentStatus}</span>
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
                </main>
                <BottomNav />
            </div>
        );
    }

    const renderBookingCard = (b: ApiBooking, isUpcomingCard: boolean) => {
        const isOtcActive = otcActiveBookings.has(b.id);
        const canActivateOtc = isOtcEligible(b);

        return (
            <Card
                key={b.id}
                className={`cursor-pointer hover:shadow-md transition-shadow ${!isUpcomingCard ? 'opacity-80' : ''}`}
                onClick={() => setSelectedBooking(b)}
            >
                <CardContent className="p-4">
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
                                    isUpcomingCard ? 'EEEE, MMM d' : 'MMM d, yyyy',
                                )}{' '}
                                · {b.startTime} - {b.endTime}
                            </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <Badge className={bookingStatusColors[b.status] ?? ''}>
                                {b.status.replace(/_/g, ' ')}
                            </Badge>
                            {isOtcActive && (
                                <Badge className="bg-warning/10 text-warning text-[10px]">
                                    OTC Active
                                </Badge>
                            )}
                        </div>
                    </div>
                    <div className="mt-2 flex justify-between text-sm">
                        <span className="text-muted-foreground">Total</span>
                        <span className="font-medium">₹{b.finalAmount}</span>
                    </div>

                    {isUpcomingCard && b.status === 'CONFIRMED' && (
                        <div
                            className="mt-3 flex gap-2"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {isOtcActive ? (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs border-warning/40 text-warning hover:bg-warning/5"
                                    onClick={() => handleCancelOtc(b.id)}
                                >
                                    Cancel OTC
                                </Button>
                            ) : canActivateOtc ? (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs"
                                    onClick={() => {
                                        setSelectedBookingId(b.id);
                                        setOtcDialogOpen(true);
                                    }}
                                >
                                    Open to Cancel
                                </Button>
                            ) : null}
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    const isLoading = upcomingLoading || pastLoading;

    return (
        <div className="min-h-screen bg-background pb-20">
            <header className="bg-primary px-4 pb-4 pt-10 text-primary-foreground">
                <h1 className="text-xl font-bold">My Bookings</h1>
            </header>

            <main className="mx-auto max-w-lg space-y-6 px-4 pt-4">
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
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
                        ? upcomingBookings.find((b) => b.id === selectedBookingId)
                              ?.venue.name || 'this venue'
                        : 'this venue'
                }
                onConfirm={handleActivateOtc}
                loading={cancelLoading}
            />

            <BottomNav />
        </div>
    );
};

export default MyBookings;
