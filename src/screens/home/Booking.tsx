import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { getVenueDetail } from '../../api/adapters/venues';
import { getCourtDetail } from '../../api/adapters/courts';
import { createBooking, verifyBookingPayment } from '../../api/adapters/bookings';
import { DateStrip } from '../../components/DateStrip';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { cn } from '../../utils/twMerge';
import { useQuery } from '@tanstack/react-query';

// slot keyed by startTime per court
type CourtSlotMap = Record<string, ApiSlot[]>;
type CourtPeakMap = Record<string, ApiPeakHourPricing[]>;

function getEffectivePrice(
    startTime: string,
    date: Date,
    peakPricings: ApiPeakHourPricing[],
    basePrice: number,
): number {
    const dayOfWeek = date.getDay();
    const peak = peakPricings.find(
        (p) =>
            (p.dayOfWeek === null || p.dayOfWeek === dayOfWeek) &&
            startTime >= p.startTime &&
            startTime < p.endTime,
    );
    return peak ? peak.pricePerSlot : basePrice;
}

const Booking = () => {
    const { facilityId, courtId } = useParams();
    const navigate = useNavigate();

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedSport, setSelectedSport] = useState('');
    const [selectedCourt, setSelectedCourt] = useState('');
    const [selectedSlots, setSelectedSlots] = useState<string[]>([]); // startTime keys
    const [courtSlotsData, setCourtSlotsData] = useState<CourtSlotMap>({});
    const [courtPeakData, setCourtPeakData] = useState<CourtPeakMap>({});
    const [slotsLoading, setSlotsLoading] = useState(false);

    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    const { data: venueData, isLoading: venueLoading } = useQuery({
        queryKey: ['venue', facilityId],
        queryFn: () => getVenueDetail(facilityId!),
        enabled: !!facilityId,
    });

    const facility = venueData?.data?.venue;
    const courtsBySport: Record<string, ApiCourt[]> = venueData?.data?.courtsBySport ?? {};
    const availableSports = Object.keys(courtsBySport);

    // Set initial sport + court once venue loads
    useEffect(() => {
        if (!availableSports.length) return;
        const initialSport = courtId
            ? Object.entries(courtsBySport).find(([, cs]) =>
                  cs.some((c) => c.id === courtId),
              )?.[0] ?? availableSports[0]
            : availableSports[0];
        setSelectedSport(initialSport);
        setSelectedCourt(courtId || courtsBySport[initialSport]?.[0]?.id || '');
    }, [venueData]);

    const filteredCourts: ApiCourt[] = courtsBySport[selectedSport] ?? [];

    // Fetch slots for all filtered courts whenever sport/date changes
    useEffect(() => {
        if (!filteredCourts.length) return;
        let cancelled = false;
        setSlotsLoading(true);
        setCourtSlotsData({});
        setCourtPeakData({});
        setSelectedSlots([]);
        setSelectedCourt(filteredCourts[0]?.id || '');

        Promise.all(
            filteredCourts.map(async (c) => {
                try {
                    const res = await getCourtDetail(c.id, dateStr);
                    const { isClosed, session1, session2 } = res.data.availability;
                    const slots = isClosed ? [] : [...(session1 ?? []), ...(session2 ?? [])];
                    const peaks = res.data.court.peakHourPricings ?? [];
                    return { courtId: c.id, slots, peaks };
                } catch {
                    return { courtId: c.id, slots: [], peaks: [] };
                }
            }),
        ).then((results) => {
            if (cancelled) return;
            setCourtSlotsData(Object.fromEntries(results.map((r) => [r.courtId, r.slots])));
            setCourtPeakData(Object.fromEntries(results.map((r) => [r.courtId, r.peaks])));
        }).finally(() => {
            if (!cancelled) setSlotsLoading(false);
        });

        return () => { cancelled = true; };
    }, [filteredCourts.map((c) => c.id).join(','), dateStr]);

    const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

    // All unique time labels from first court's slots, filtered to future slots on today
    const timeLabels = useMemo(
        () => (courtSlotsData[filteredCourts[0]?.id] ?? [])
            .filter((s) => {
                if (!isToday) return true;
                const [h, m] = s.startTime.split(':').map(Number);
                return h * 60 + m > nowMinutes;
            })
            .map((s) => s.startTime),
        [courtSlotsData, filteredCourts],
    );

    const selectedCourtData = filteredCourts.find((c) => c.id === selectedCourt);
    const basePrice = selectedCourtData?.courtPricings[0]?.pricePerSlot ?? 0;
    const allSlotsForCourt = courtSlotsData[selectedCourt] ?? [];
    const selectedPeaks = courtPeakData[selectedCourt] ?? [];
    const selectedSlotObjects = allSlotsForCourt.filter((s) =>
        selectedSlots.includes(s.startTime),
    );
    const totalPrice = selectedSlotObjects.reduce(
        (sum, s) => sum + getEffectivePrice(s.startTime, selectedDate, selectedPeaks, basePrice),
        0,
    );
    const bookingFee = Math.round(totalPrice * 0.1);
    const gst = Number(((totalPrice + bookingFee) * 0.05).toFixed(2));
    const grandTotal = totalPrice + bookingFee + gst;

    const handleSlotTap = (courtId: string, startTime: string) => {
        const slots = courtSlotsData[courtId] ?? [];
        const slot = slots.find((s) => s.startTime === startTime);
        if (!slot || slot.status !== 'available') return;

        // switching court resets
        if (courtId !== selectedCourt) {
            setSelectedCourt(courtId);
            setSelectedSlots([startTime]);
            return;
        }

        const idx = selectedSlots.indexOf(startTime);
        if (idx !== -1) {
            setSelectedSlots(selectedSlots.slice(0, idx));
            return;
        }
        const lastSlot = allSlotsForCourt.find(
            (s) => s.startTime === selectedSlots[selectedSlots.length - 1],
        );
        if (!lastSlot || lastSlot.endTime === startTime) {
            setSelectedSlots([...selectedSlots, startTime]);
        } else {
            setSelectedSlots([startTime]);
        }
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
                description: `${selectedCourtData?.name} — ${selectedSlots.length} slot(s)`,
                handler: async (payment) => {
                    try {
                        await verifyBookingPayment(booking.id, {
                            razorpayPaymentId: payment.razorpay_payment_id,
                            razorpayOrderId: payment.razorpay_order_id,
                            razorpaySignature: payment.razorpay_signature,
                        });
                        toast.success('Booking confirmed!');
                        setSelectedSlots([]);
                        navigate(-1);
                    } catch {
                        toast.error('Payment verification failed.');
                    }
                },
                modal: { ondismiss: () => toast.error('Payment cancelled.') },
                theme: { color: '#2563eb' },
            });
            rzp.open();
        },
        onError: () => toast.error('Booking failed. Please try again.'),
    });

    if (venueLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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

    return (
        <div className="min-h-screen bg-background pb-10">
            {/* Header */}
            <header className="flex items-center gap-3 bg-primary px-4 pb-4 pt-10 text-primary-foreground">
                <button
                    onClick={() => navigate(-1)}
                    className="rounded-full p-1 hover:bg-primary-foreground/10"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="font-semibold">{facility.name}</h1>
                    <p className="text-xs opacity-80">Select Court &amp; Time</p>
                </div>
            </header>

            <main className="mx-auto max-w-lg px-4 pt-4 space-y-4">
                {/* Sport chips */}
                {availableSports.length > 1 && (
                    <div className="flex gap-2 flex-wrap">
                        {availableSports.map((sport) => (
                            <button
                                key={sport}
                                onClick={() => {
                                    if (sport === selectedSport) return;
                                    setSelectedSport(sport);
                                    setSelectedSlots([]);
                                    setSelectedCourt('');
                                    setCourtSlotsData({});
                                }}
                                className={cn(
                                    'rounded-full px-4 py-1.5 text-sm font-semibold transition-all',
                                    sport === selectedSport
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'bg-card border text-muted-foreground hover:bg-accent',
                                )}
                            >
                                {sport}
                            </button>
                        ))}
                    </div>
                )}

                <DateStrip
                    selected={selectedDate}
                    onSelect={(d) => {
                        setSelectedDate(d);
                        setSelectedSlots([]);
                    }}
                />

                {/* Slot grid */}
                {slotsLoading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : timeLabels.length === 0 ? (
                    <div className="py-16 text-center text-muted-foreground">
                        <p className="font-medium">No slots available</p>
                        <p className="text-sm mt-1">Try a different date</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        {/* Sticky court header */}
                        <div className="flex border-b pb-2 mb-1 sticky top-0 bg-background z-10">
                            <div className="w-14 shrink-0" />
                            {filteredCourts.map((c) => (
                                <div
                                    key={c.id}
                                    className="flex-1 min-w-[90px] text-center"
                                >
                                    <p className="text-xs font-bold text-foreground">
                                        {c.name}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                        from ₹{c.courtPricings[0]?.pricePerSlot ?? 0}/slot
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Time rows */}
                        <div className="space-y-1">
                            {timeLabels.map((time) => (
                                <div key={time} className="flex gap-1 items-center">
                                    {/* Time label */}
                                    <div className="w-14 shrink-0 text-xs text-muted-foreground font-medium">
                                        {time}
                                    </div>

                                    {/* Cell per court */}
                                    {filteredCourts.map((c) => {
                                        const slot = (courtSlotsData[c.id] ?? []).find(
                                            (s) => s.startTime === time,
                                        );
                                        if (!slot) return (
                                            <div key={c.id} className="flex-1 min-w-[90px] h-14 rounded-lg bg-muted/30" />
                                        );

                                        const isAvailable = slot.status === 'available';
                                        const isSelected =
                                            selectedCourt === c.id &&
                                            selectedSlots.includes(slot.startTime);

                                        return (
                                            <button
                                                key={c.id}
                                                disabled={!isAvailable}
                                                onClick={() => handleSlotTap(c.id, slot.startTime)}
                                                className={cn(
                                                    'flex-1 min-w-[90px] h-14 rounded-lg flex flex-col items-center justify-center text-xs font-semibold transition-all border',
                                                    isSelected &&
                                                        'bg-primary text-primary-foreground border-primary shadow-sm',
                                                    isAvailable && !isSelected &&
                                                        'bg-green-500/10 text-green-700 border-green-500/30 hover:bg-green-500/20 dark:text-green-400',
                                                    !isAvailable &&
                                                        'bg-muted text-muted-foreground border-border cursor-not-allowed opacity-50',
                                                )}
                                            >
                                                <span>
                                                    {isSelected
                                                        ? 'Selected'
                                                        : isAvailable
                                                          ? 'Open'
                                                          : slot.status === 'booked'
                                                            ? 'Booked'
                                                            : 'N/A'}
                                                </span>
                                                {isAvailable && (
                                                    <span
                                                        className={cn(
                                                            'text-[10px] mt-0.5',
                                                            isSelected
                                                                ? 'text-primary-foreground/80'
                                                                : 'text-green-600 dark:text-green-400',
                                                        )}
                                                    >
                                                        ₹{getEffectivePrice(
                                                                slot.startTime,
                                                                selectedDate,
                                                                courtPeakData[c.id] ?? [],
                                                                c.courtPricings[0]?.pricePerSlot ?? 0,
                                                            )}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Booking summary */}
                {selectedSlots.length > 0 && selectedCourtData && (
                    <Card className="border-primary/20 shadow-sm">
                        <CardContent className="p-4 space-y-3">
                            <h3 className="font-semibold text-foreground">
                                Booking Summary
                            </h3>
                            <div className="space-y-1.5 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Court</span>
                                    <span className="font-medium">{selectedCourtData.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Date</span>
                                    <span className="font-medium">{format(selectedDate, 'MMM d, yyyy')}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Time</span>
                                    <span className="font-medium">
                                        {selectedSlotObjects[0]?.startTime} –{' '}
                                        {selectedSlotObjects[selectedSlotObjects.length - 1]?.endTime}
                                    </span>
                                </div>
                                {selectedSlotObjects.map((s) => {
                                    const slotPrice = getEffectivePrice(s.startTime, selectedDate, selectedPeaks, basePrice);
                                    const isPeak = slotPrice !== basePrice;
                                    return (
                                        <div key={s.startTime} className="flex justify-between">
                                            <span className="text-muted-foreground">
                                                {s.startTime} – {s.endTime}
                                                {isPeak && (
                                                    <span className="ml-1.5 text-[10px] rounded-full bg-orange-100 text-orange-600 px-1.5 py-0.5">
                                                        Peak
                                                    </span>
                                                )}
                                            </span>
                                            <span>₹{slotPrice}</span>
                                        </div>
                                    );
                                })}
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Booking fee (10%)</span>
                                    <span>₹{bookingFee}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">GST (5%)</span>
                                    <span>₹{gst}</span>
                                </div>
                                <div className="flex justify-between border-t pt-2 font-semibold text-base">
                                    <span>Total</span>
                                    <span className="text-primary">₹{grandTotal.toFixed(2)}</span>
                                </div>
                            </div>
                            <Button
                                className="w-full"
                                onClick={() => confirmBooking()}
                                disabled={bookingLoading}
                            >
                                {bookingLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Processing…
                                    </>
                                ) : (
                                    'Confirm & Pay'
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </main>
        </div>
    );
};

export default Booking;
