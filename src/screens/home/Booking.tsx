import { useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ArrowLeft, Share2 } from 'lucide-react';
import { getVenueDetail } from '../../api/adapters/venues';
import { getCourtDetail } from '../../api/adapters/courts';
import { createBooking, verifyBookingPayment } from '../../api/adapters/bookings';
import { DateStrip } from '../../components/DateStrip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { TimeSlotGrid } from '../../components/TimeSlotGrid';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

const Booking = () => {
    const { facilityId, courtId } = useParams();
    const navigate = useNavigate();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
    const [selectedCourt, setSelectedCourt] = useState(courtId || '');

    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    const { data: venueData, isLoading: venueLoading } = useQuery({
        queryKey: ['venue', facilityId],
        queryFn: () => getVenueDetail(facilityId!),
        enabled: !!facilityId,
    });

    const { data: courtData, isLoading: slotsLoading } = useQuery({
        queryKey: ['court-slots', selectedCourt, dateStr],
        queryFn: () => getCourtDetail(selectedCourt, dateStr),
        enabled: !!selectedCourt,
    });

    const facility = venueData?.data?.venue;
    const courts = Object.values(venueData?.data?.courtsBySport ?? {}).flat();
    const court = courts.find((c) => c.id === selectedCourt);
    const pricePerSlot = court?.courtPricings[0]?.pricePerSlot ?? 0;

    const session1 = courtData?.data?.availability?.session1 ?? [];
    const session2 = courtData?.data?.availability?.session2 ?? [];
    const slots: ApiSlot[] = [...session1, ...session2];
    const selectedSlotObjects = slots.filter((s) => selectedSlots.includes(s.startTime));
    const totalPrice = pricePerSlot * selectedSlots.length;

    const handleToggleSlot = (startTime: string) => {
        setSelectedSlots((prev) =>
            prev.includes(startTime)
                ? prev.filter((t) => t !== startTime)
                : [...prev, startTime],
        );
    };

    const { mutate: confirmBooking, isPending: bookingLoading } = useMutation({
        mutationFn: () =>
            createBooking({
                courtId: selectedCourt,
                bookingDate: dateStr,
                slots: selectedSlotObjects.map((s) => ({
                    startTime: s.startTime,
                    endTime: s.endTime,
                })),
                paymentMethod: 'UPI',
            }),
        onSuccess: (res) => {
            const { booking, razorpay } = res.data;
            const rzp = new window.Razorpay({
                key: razorpay.keyId,
                amount: razorpay.amount,
                currency: razorpay.currency,
                order_id: razorpay.orderId,
                name: facility?.name ?? 'BookEase',
                description: `${court?.name} — ${selectedSlots.length} slot(s)`,
                handler: async (payment) => {
                    try {
                        await verifyBookingPayment(booking.id, {
                            razorpayPaymentId: payment.razorpay_payment_id,
                            razorpayOrderId: payment.razorpay_order_id,
                            razorpaySignature: payment.razorpay_signature,
                        });
                        toast.success('Booking confirmed!', {
                            description: `${court?.name} on ${format(selectedDate, 'MMM d')} — ${selectedSlots.length} slot(s)`,
                        });
                        setSelectedSlots([]);
                        navigate(-1);
                    } catch {
                        toast.error('Payment verification failed. Contact support.');
                    }
                },
                modal: {
                    ondismiss: () => toast.error('Payment cancelled.'),
                },
                theme: { color: '#2563eb' },
            });
            rzp.open();
        },
        onError: () => toast.error('Booking failed. Please try again.'),
    });

    if (venueLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center text-muted-foreground">
                Loading…
            </div>
        );
    }

    if (!facility) {
        return (
            <div className="flex min-h-screen items-center justify-center text-muted-foreground">
                Facility not found
            </div>
        );
    }

    const handleConfirm = () => {
        if (selectedSlots.length === 0 || !court) return;
        confirmBooking();
    };

    return (
        <div className="min-h-screen bg-background pb-6">
            <header className="flex items-center gap-3 bg-primary px-4 pb-4 pt-10 text-primary-foreground">
                <button
                    onClick={() => navigate(-1)}
                    className="rounded-full p-1 hover:bg-primary-foreground/10"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex-1">
                    <h1 className="font-semibold">{facility.name}</h1>
                    <p className="text-xs opacity-80">Select date & time</p>
                </div>
                <button className="rounded-full p-2 hover:bg-primary-foreground/10">
                    <Share2 className="h-5 w-5" />
                </button>
            </header>

            <main className="mx-auto max-w-lg px-4 pt-4">
                <DateStrip selected={selectedDate} onSelect={setSelectedDate} />

                <Tabs
                    value={selectedCourt}
                    onValueChange={(id) => {
                        setSelectedCourt(id);
                        setSelectedSlots([]);
                    }}
                    className="mt-4"
                >
                    <TabsList className="w-full">
                        {courts.map((c) => (
                            <TabsTrigger key={c.id} value={c.id} className="flex-1">
                                {c.name}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    {courts.map((c) => (
                        <TabsContent key={c.id} value={c.id}>
                            <div className="mb-2 flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                    {format(selectedDate, 'EEEE, MMM d')}
                                </span>
                                <span className="font-medium text-primary">
                                    ₹{c.courtPricings[0]?.pricePerSlot ?? 0}/slot
                                </span>
                            </div>
                            {slotsLoading ? (
                                <div className="grid grid-cols-3 gap-2">
                                    {Array.from({ length: 9 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="h-16 animate-pulse rounded-lg bg-muted"
                                        />
                                    ))}
                                </div>
                            ) : (
                                <TimeSlotGrid
                                    slots={slots}
                                    selectedSlots={selectedSlots}
                                    onSelect={handleToggleSlot}
                                />
                            )}
                        </TabsContent>
                    ))}
                </Tabs>

                {/* Booking summary */}
                {selectedSlots.length > 0 && court && (
                    <Card className="mt-4 border-primary/20">
                        <CardContent className="p-4">
                            <h3 className="font-semibold text-foreground">
                                Booking Summary
                            </h3>
                            <div className="mt-2 space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Court</span>
                                    <span>{court.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Date</span>
                                    <span>{format(selectedDate, 'MMM d, yyyy')}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Slots</span>
                                    <span>{selectedSlots.length} × 30 min</span>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    {selectedSlotObjects.map((s) => (
                                        <div key={s.startTime} className="flex justify-between text-muted-foreground">
                                            <span className="pl-2 text-xs">· {s.startTime} – {s.endTime}</span>
                                            <span className="text-xs">₹{pricePerSlot}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Booking Fee</span>
                                    <span>₹{(totalPrice * 0.1).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">GST (5%)</span>
                                    <span>₹{(totalPrice * 1.1 * 0.05).toFixed(2)}</span>
                                </div>
                                <div className="mt-2 flex justify-between border-t pt-2 font-semibold">
                                    <span>Total</span>
                                    <span className="text-primary">
                                        ₹{(totalPrice * 1.1 * 1.05).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                            <Button
                                className="mt-4 w-full"
                                onClick={handleConfirm}
                                disabled={bookingLoading}
                            >
                                {bookingLoading ? 'Confirming…' : 'Confirm Booking'}
                            </Button>
                            <p className="mt-3 text-center text-xs text-muted-foreground">
                                By confirming, you agree to our{' '}
                                <button
                                    type="button"
                                    onClick={() => window.open('/terms', '_blank')}
                                    className="underline text-primary hover:text-primary/80"
                                >
                                    Terms &amp; Conditions
                                </button>{' '}
                                and{' '}
                                <button
                                    type="button"
                                    onClick={() => window.open('/privacy', '_blank')}
                                    className="underline text-primary hover:text-primary/80"
                                >
                                    Privacy Policy
                                </button>
                                .
                            </p>
                        </CardContent>
                    </Card>
                )}
            </main>
        </div>
    );
};

export default Booking;
