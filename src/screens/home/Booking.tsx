import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ArrowLeft, Clock, Loader2, Share2, X } from 'lucide-react';
import { getVenueDetail } from '../../api/adapters/venues';
import { getCourtDetail } from '../../api/adapters/courts';
import { holdSlot } from '../../api/adapters/bookings';
import { DateStrip } from '../../components/DateStrip';
import { Button } from '../../components/ui/button';
import { cn, formatTime } from '../../utils/twMerge';
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
    const courtsBySport: Record<string, ApiCourt[]> =
        venueData?.data?.courtsBySport ?? {};
    const availableSports = Object.keys(courtsBySport);

    // Set initial sport + court once venue loads
    useEffect(() => {
        if (!availableSports.length) return;
        const initialSport = courtId
            ? (Object.entries(courtsBySport).find(([, cs]) =>
                  cs.some((c) => c.id === courtId),
              )?.[0] ?? availableSports[0])
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
                    const { isClosed, session1, session2 } =
                        res.data.availability;
                    const slots = isClosed
                        ? []
                        : [...(session1 ?? []), ...(session2 ?? [])];
                    const peaks = res.data.court.peakHourPricings ?? [];
                    return { courtId: c.id, slots, peaks };
                } catch {
                    return { courtId: c.id, slots: [], peaks: [] };
                }
            }),
        )
            .then((results) => {
                if (cancelled) return;
                setCourtSlotsData(
                    Object.fromEntries(
                        results.map((r) => [r.courtId, r.slots]),
                    ),
                );
                setCourtPeakData(
                    Object.fromEntries(
                        results.map((r) => [r.courtId, r.peaks]),
                    ),
                );
            })
            .finally(() => {
                if (!cancelled) setSlotsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [filteredCourts.map((c) => c.id).join(','), dateStr]);

    const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

    // All unique time labels from first court's slots, filtered to future slots on today
    const timeLabels = useMemo(
        () =>
            (courtSlotsData[filteredCourts[0]?.id] ?? [])
                .filter((s) => {
                    if (!isToday) return true;
                    const [h, m] = s.startTime.split(':').map(Number);
                    return h * 60 + m > nowMinutes;
                })
                .map((s) => s.startTime),
        [courtSlotsData, filteredCourts],
    );

    const selectedCourtData = filteredCourts.find(
        (c) => c.id === selectedCourt,
    );
    const basePrice = selectedCourtData?.courtPricings[0]?.pricePerSlot ?? 0;
    const allSlotsForCourt = courtSlotsData[selectedCourt] ?? [];
    const selectedPeaks = courtPeakData[selectedCourt] ?? [];
    const selectedSlotObjects = allSlotsForCourt.filter((s) =>
        selectedSlots.includes(s.startTime),
    );
    const totalPrice = selectedSlotObjects.reduce(
        (sum, s) =>
            sum +
            getEffectivePrice(
                s.startTime,
                selectedDate,
                selectedPeaks,
                basePrice,
            ),
        0,
    );

    const minimumSlotMinutes = facility?.bookingPolicy?.minimumSlotMinutes ?? 0;
    const selectedDurationMinutes = useMemo(() => {
        if (!selectedSlotObjects.length) return 0;
        const toMin = (t: string) => {
            const [h, m] = t.split(':').map(Number);
            return h * 60 + m;
        };
        return (
            toMin(selectedSlotObjects[selectedSlotObjects.length - 1].endTime) -
            toMin(selectedSlotObjects[0].startTime)
        );
    }, [selectedSlotObjects]);
    const belowMinimum =
        minimumSlotMinutes > 0 && selectedDurationMinutes < minimumSlotMinutes;

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

    const [isSharing, setIsSharing] = useState(false);

    const handleShare = async () => {
        if (!facility) return;

        const formattedDate = format(selectedDate, 'EEEE, d MMMM yyyy');
        const mapsLink =
            facility.latitude && facility.longitude
                ? `https://maps.google.com/?q=${facility.latitude},${facility.longitude}`
                : `https://maps.google.com/?q=${encodeURIComponent(`${facility.name} ${facility.city}`)}`;

        // Build availability rows per time slot across all courts
        const courtNames = filteredCourts.map((c) => c.name).join('  ');
        const rows = timeLabels.map((time) => {
            const dots = filteredCourts
                .map((c) => {
                    const slot = (courtSlotsData[c.id] ?? []).find(
                        (s) => s.startTime === time,
                    );
                    return slot?.status === 'available'
                        ? '\uD83D\uDFE9'
                        : '\uD83D\uDFE5';
                })
                .join('  ');
            return `${dots}  ${formatTime(time)}`;
        });

        const lines = [
            `\uD83C\uDFDF\uFE0F ${facility.name} \u2014 Court Availability`,
            `\uD83D\uDCC5 ${formattedDate}`,
            `\uD83C\uDFBE Sport: ${selectedSport}`,
            ``,
            `     ${courtNames}`,
            ...rows,
            ``,
            `\uD83D\uDFE9 Available  \uD83D\uDFE5 Booked`,
            ``,
            `\uD83D\uDCCD ${facility.city}`,
            `\uD83D\uDDFA\uFE0F Directions: ${mapsLink}`,
            ``,
            `\uD83D\uDC49 Book now: ${window.location.href}`,
            ``,
            `See you on the court! \uD83C\uDFC6`,
        ];
        const text = lines.join('\n');

        setIsSharing(true);
        try {
            if (navigator.share) {
                await navigator.share({
                    title: `🏟️ ${facility.name} — Availability`,
                    text,
                });
            } else {
                await navigator.clipboard.writeText(text);
                toast.success('Availability copied to clipboard!');
            }
        } catch {
            // user cancelled — ignore
        } finally {
            setIsSharing(false);
        }
    };

    const { mutate: reviewBooking, isPending: holdLoading } = useMutation({
        mutationFn: () =>
            holdSlot({
                courtId: selectedCourt,
                bookingDate: dateStr,
                slots: selectedSlotObjects.map((s) => ({
                    startTime: s.startTime,
                    endTime: s.endTime,
                })),
            }),
        onSuccess: (res) => {
            const { booking } = res.data;
            navigate('/confirm-booking', {
                state: {
                    holdId: booking.id,
                    venueId: facilityId,
                    venueName: facility!.name,
                    venueAddress: [facility!.city, facility!.address]
                        .filter(Boolean)
                        .join(', '),
                    sport: selectedSport,
                    bookingDate: dateStr,
                    courtName: selectedCourtData!.name,
                    slots: selectedSlotObjects,
                    totalPrice: Number(booking.totalAmount),
                    discountAmount: Number(booking.discountAmount ?? 0),
                    finalAmount: Number(booking.finalAmount),
                    createdAt: booking.createdAt,
                    latitude: facility!.latitude ?? null,
                    longitude: facility!.longitude ?? null,
                },
            });
        },
        onError: () => toast.error('Could not hold slot. Please try again.'),
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
        <div className="min-h-screen bg-background pb-28">
            {/* Header */}
            <header className="flex items-center gap-3 bg-primary px-4 pb-4 pt-10 text-primary-foreground">
                <button
                    onClick={() => navigate(-1)}
                    className="rounded-full p-1 hover:bg-primary-foreground/10"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="font-semibold">{facility.name}</h1>
                    <p className="text-xs opacity-80">
                        Select Court &amp; Time
                    </p>
                </div>
                {/* Share button */}
                <button
                    onClick={handleShare}
                    disabled={isSharing}
                    className="rounded-full p-2 hover:bg-primary-foreground/10 disabled:opacity-50 shrink-0"
                    aria-label="Share availability"
                >
                    {isSharing ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <Share2 className="h-5 w-5" />
                    )}
                </button>
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
                                        from ₹
                                        {c.courtPricings[0]?.pricePerSlot ?? 0}
                                        /slot
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Time rows */}
                        <div className="space-y-1">
                            {timeLabels.map((time) => (
                                <div
                                    key={time}
                                    className="flex gap-1 items-center"
                                >
                                    {/* Time label */}
                                    <div className="w-14 shrink-0 text-xs text-muted-foreground font-medium">
                                        {formatTime(time)}
                                    </div>

                                    {/* Cell per court */}
                                    {filteredCourts.map((c) => {
                                        const slot = (
                                            courtSlotsData[c.id] ?? []
                                        ).find((s) => s.startTime === time);
                                        if (!slot)
                                            return (
                                                <div
                                                    key={c.id}
                                                    className="flex-1 min-w-[90px] h-14 rounded-lg bg-muted/30"
                                                />
                                            );

                                        const isAvailable =
                                            slot.status === 'available';
                                        const isHeld = slot.status === 'held';
                                        const isSelected =
                                            selectedCourt === c.id &&
                                            selectedSlots.includes(
                                                slot.startTime,
                                            );
                                        const courtBase =
                                            c.courtPricings[0]?.pricePerSlot ??
                                            0;
                                        const isPeak =
                                            isAvailable &&
                                            getEffectivePrice(
                                                slot.startTime,
                                                selectedDate,
                                                courtPeakData[c.id] ?? [],
                                                courtBase,
                                            ) !== courtBase;

                                        return (
                                            <button
                                                key={c.id}
                                                disabled={!isAvailable}
                                                onClick={() =>
                                                    handleSlotTap(
                                                        c.id,
                                                        slot.startTime,
                                                    )
                                                }
                                                className={cn(
                                                    'flex-1 min-w-[90px] h-14 rounded-lg flex flex-col items-center justify-center text-xs font-semibold transition-all border',
                                                    isSelected &&
                                                        'bg-primary text-primary-foreground border-primary shadow-sm',
                                                    isAvailable &&
                                                        !isSelected &&
                                                        'bg-green-500/10 text-green-700 border-green-500/30 hover:bg-green-500/20 dark:text-green-400',
                                                    isHeld &&
                                                        'bg-amber-50 text-amber-600 border-amber-200 cursor-not-allowed dark:bg-amber-950/20 dark:text-amber-400',
                                                    !isAvailable &&
                                                        !isHeld &&
                                                        'bg-muted text-muted-foreground border-border cursor-not-allowed opacity-50',
                                                )}
                                            >
                                                {isHeld ? (
                                                    <>
                                                        <Clock className="h-3.5 w-3.5 mb-0.5" />
                                                        <span>Held</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="flex items-center gap-1">
                                                            <span>
                                                                {isSelected
                                                                    ? 'Selected'
                                                                    : isAvailable
                                                                      ? 'Open'
                                                                      : 'Booked'}
                                                            </span>
                                                            {isPeak && (
                                                                <span
                                                                    className={cn(
                                                                        'flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold',
                                                                        isSelected
                                                                            ? 'bg-purple-300 text-purple-900'
                                                                            : 'bg-purple-600 text-white',
                                                                    )}
                                                                >
                                                                    P
                                                                </span>
                                                            )}
                                                        </div>
                                                        {isAvailable && (
                                                            <span
                                                                className={cn(
                                                                    'text-[10px] mt-0.5',
                                                                    isSelected
                                                                        ? 'text-primary-foreground/80'
                                                                        : 'text-green-600 dark:text-green-400',
                                                                )}
                                                            >
                                                                ₹
                                                                {getEffectivePrice(
                                                                    slot.startTime,
                                                                    selectedDate,
                                                                    courtPeakData[
                                                                        c.id
                                                                    ] ?? [],
                                                                    courtBase,
                                                                )}
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* Sticky bottom bar */}
            {selectedSlots.length > 0 && selectedCourtData && (
                <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50">
                    <div className="mx-auto max-w-lg px-4 py-3 flex items-center gap-3">
                        <button
                            onClick={() => setSelectedSlots([])}
                            className="rounded-full p-1.5 bg-muted hover:bg-muted/80 shrink-0"
                        >
                            <X className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">
                                {selectedSlots.length} slot
                                {selectedSlots.length > 1 ? 's' : ''} · ₹
                                {totalPrice}
                            </p>
                            {belowMinimum ? (
                                <p className="text-xs text-destructive">
                                    Min. booking is {minimumSlotMinutes} min (
                                    {selectedDurationMinutes} min selected)
                                </p>
                            ) : (
                                <p className="text-xs text-muted-foreground truncate">
                                    {selectedSlotObjects[0]
                                        ? formatTime(
                                              selectedSlotObjects[0].startTime,
                                          )
                                        : ''}{' '}
                                    –{' '}
                                    {selectedSlotObjects[
                                        selectedSlotObjects.length - 1
                                    ]
                                        ? formatTime(
                                              selectedSlotObjects[
                                                  selectedSlotObjects.length - 1
                                              ].endTime,
                                          )
                                        : ''}
                                </p>
                            )}
                        </div>
                        <Button
                            onClick={() => reviewBooking()}
                            disabled={holdLoading || belowMinimum}
                            className="shrink-0"
                        >
                            {holdLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                'Review Booking'
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Booking;
