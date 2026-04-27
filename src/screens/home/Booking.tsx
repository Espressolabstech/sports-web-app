import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ArrowLeft, CalendarDays, Clock, Loader2, Share2, X } from 'lucide-react';
import { getVenueDetail } from '../../api/adapters/venues';
import { getCourtDetail } from '../../api/adapters/courts';
import { holdSlot } from '../../api/adapters/bookings';
import { DateStrip } from '../../components/DateStrip';
import { Button } from '../../components/ui/button';
import { cn, formatTime } from '../../utils/twMerge';
import { useQuery } from '@tanstack/react-query';
import { getToken } from '../../utils/cookies.helpers';
import { PhoneLoginModal } from '../../components/PhoneLoginModal';

// ── Types ────────────────────────────────────────────────────────────────────
type CourtSlotMap = Record<string, ApiSlot[]>;
type CourtPeakMap = Record<string, ApiPeakHourPricing[]>;

// courtId → selected startTimes (contiguous per court, multiple courts allowed per date)
type DateSelection = Record<string, string[]>;

// ── Helpers ──────────────────────────────────────────────────────────────────
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

/**
 * Cache key encodes both sport and date so that switching sport
 * automatically invalidates the cache without explicit clearing.
 */
const makeKey = (sport: string, dateStr: string) => `${sport}__${dateStr}`;

// ── Component ────────────────────────────────────────────────────────────────
const Booking = () => {
    const { facilityId, courtId: initialCourtId } = useParams();
    const navigate = useNavigate();

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedSport, setSelectedSport] = useState('');

    // Multi-date selection: cacheKey → { courtId, slots[] }
    const [selectionByKey, setSelectionByKey] = useState<Record<string, DateSelection>>({});
    // Slot / peak caches: cacheKey → CourtSlotMap / CourtPeakMap
    const [slotsCacheByKey, setSlotsCacheByKey] = useState<Record<string, CourtSlotMap>>({});
    const [peakCacheByKey, setPeakCacheByKey] = useState<Record<string, CourtPeakMap>>({});
    const [loadingKey, setLoadingKey] = useState<string | null>(null);

    const [holdLoading, setHoldLoading] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [loginOpen, setLoginOpen] = useState(false);

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const cacheKey = makeKey(selectedSport, dateStr);

    // Current date's derived values
    const courtSlotsData: CourtSlotMap = slotsCacheByKey[cacheKey] ?? {};
    const courtPeakData: CourtPeakMap = peakCacheByKey[cacheKey] ?? {};
    const slotsLoading = loadingKey === cacheKey;

    // ── Venue query ──────────────────────────────────────────────────────────
    const { data: venueData, isLoading: venueLoading } = useQuery({
        queryKey: ['venue', facilityId],
        queryFn: () => getVenueDetail(facilityId!),
        enabled: !!facilityId,
    });

    const facility = venueData?.data?.venue;
    const courtsBySport: Record<string, ApiCourt[]> =
        venueData?.data?.courtsBySport ?? {};
    const availableSports = Object.keys(courtsBySport);

    // Set initial sport once venue loads
    useEffect(() => {
        if (!availableSports.length) return;
        const initialSport = initialCourtId
            ? (Object.entries(courtsBySport).find(([, cs]) =>
                  cs.some((c) => c.id === initialCourtId),
              )?.[0] ?? availableSports[0])
            : availableSports[0];
        setSelectedSport(initialSport);
    }, [venueData]);

    const filteredCourts: ApiCourt[] = courtsBySport[selectedSport] ?? [];

    // ── Load slots for current cacheKey if not yet cached ────────────────────
    useEffect(() => {
        if (!selectedSport || !filteredCourts.length) return;
        if (slotsCacheByKey[cacheKey]) return; // already cached

        let cancelled = false;
        setLoadingKey(cacheKey);

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
                setSlotsCacheByKey((prev) => ({
                    ...prev,
                    [cacheKey]: Object.fromEntries(
                        results.map((r) => [r.courtId, r.slots]),
                    ),
                }));
                setPeakCacheByKey((prev) => ({
                    ...prev,
                    [cacheKey]: Object.fromEntries(
                        results.map((r) => [r.courtId, r.peaks]),
                    ),
                }));
            })
            .finally(() => {
                if (!cancelled) setLoadingKey(null);
            });

        return () => {
            cancelled = true;
        };
    }, [cacheKey, filteredCourts.map((c) => c.id).join(',')]);

    // ── Derived time labels for current date ─────────────────────────────────
    const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

    const timeLabels = useMemo(
        () =>
            (courtSlotsData[filteredCourts[0]?.id] ?? [])
                .filter((s) => {
                    if (!isToday) return true;
                    const [h, m] = s.startTime.split(':').map(Number);
                    return h * 60 + m > nowMinutes;
                })
                .map((s) => s.startTime),
        [courtSlotsData, filteredCourts, isToday, nowMinutes],
    );

    // All selected slot objects on the current date (across all courts)
    const currentDateEntries = Object.entries(selectionByKey[cacheKey] ?? {}).map(
        ([cId, startTimes]) => ({
            courtId: cId,
            slotObjs: (courtSlotsData[cId] ?? []).filter((s) =>
                startTimes.includes(s.startTime),
            ),
        }),
    );
    // For the single-entry time-range display in the bottom bar
    const selectedSlotObjects =
        currentDateEntries.length === 1 ? currentDateEntries[0].slotObjs : [];

    // ── All hold entries across dates+courts for current sport ───────────────
    const allDateEntries = useMemo(() => {
        const prefix = `${selectedSport}__`;
        const entries: {
            date: string;
            courtId: string;
            courtData: ApiCourt | undefined;
            slotObjs: ApiSlot[];
            price: number;
        }[] = [];

        Object.entries(selectionByKey)
            .filter(([key]) => key.startsWith(prefix))
            .forEach(([key, dateSel]) => {
                const date = key.slice(prefix.length);
                Object.entries(dateSel).forEach(([courtId, selectedStartTimes]) => {
                    if (!selectedStartTimes.length) return;
                    const cData = filteredCourts.find((c) => c.id === courtId);
                    const allSlots = slotsCacheByKey[key]?.[courtId] ?? [];
                    const slotObjs = allSlots.filter((s) =>
                        selectedStartTimes.includes(s.startTime),
                    );
                    const cBase = cData?.courtPricings[0]?.pricePerSlot ?? 0;
                    const peaks = peakCacheByKey[key]?.[courtId] ?? [];
                    const dateObj = new Date(date);
                    const price = slotObjs.reduce(
                        (sum, s) =>
                            sum + getEffectivePrice(s.startTime, dateObj, peaks, cBase),
                        0,
                    );
                    entries.push({ date, courtId, courtData: cData, slotObjs, price });
                });
            });

        return entries.sort(
            (a, b) => a.date.localeCompare(b.date) || a.courtId.localeCompare(b.courtId),
        );
    }, [selectionByKey, selectedSport, filteredCourts, slotsCacheByKey, peakCacheByKey]);

    const grandTotalSlots = allDateEntries.reduce((n, e) => n + e.slotObjs.length, 0);
    const grandTotalPrice = allDateEntries.reduce((n, e) => n + e.price, 0);

    // Marked dates for DateStrip badges (deduplicated)
    const markedDates = useMemo(
        () =>
            [
                ...new Set(
                    allDateEntries
                        .filter((e) => e.date !== dateStr)
                        .map((e) => e.date),
                ),
            ],
        [allDateEntries, dateStr],
    );

    // ── Minimum slot validation ──────────────────────────────────────────────
    const minimumSlotMinutes = facility?.bookingPolicy?.minimumSlotMinutes ?? 0;

    const slotDuration = (slotObjs: ApiSlot[]) => {
        if (!slotObjs.length) return 0;
        const toMin = (t: string) => {
            const [h, m] = t.split(':').map(Number);
            return h * 60 + m;
        };
        return (
            toMin(slotObjs[slotObjs.length - 1].endTime) -
            toMin(slotObjs[0].startTime)
        );
    };

    // Warn for the currently viewed date if any single court is below minimum
    const currentDurationMinutes = Math.max(
        0,
        ...currentDateEntries.map((e) => slotDuration(e.slotObjs)),
    );
    const belowMinimumCurrent =
        minimumSlotMinutes > 0 &&
        currentDateEntries.length > 0 &&
        currentDateEntries.some(
            (e) => e.slotObjs.length > 0 && slotDuration(e.slotObjs) < minimumSlotMinutes,
        );

    // Block "Review Booking" if ANY entry is below minimum
    const anyBelowMinimum =
        minimumSlotMinutes > 0 &&
        allDateEntries.some(
            (e) => e.slotObjs.length > 0 && slotDuration(e.slotObjs) < minimumSlotMinutes,
        );

    // ── Handlers ─────────────────────────────────────────────────────────────
    /** Helper to update just one court's slots within a date's selection */
    const setCourtSlots = (courtId: string, newSlots: string[]) => {
        setSelectionByKey((prev) => {
            const dateSel = { ...(prev[cacheKey] ?? {}) };
            if (newSlots.length === 0) {
                delete dateSel[courtId];
            } else {
                dateSel[courtId] = newSlots;
            }
            if (Object.keys(dateSel).length === 0) {
                const next = { ...prev };
                delete next[cacheKey];
                return next;
            }
            return { ...prev, [cacheKey]: dateSel };
        });
    };

    const handleSlotTap = (courtId: string, startTime: string) => {
        const allSlots = courtSlotsData[courtId] ?? [];
        const slot = allSlots.find((s) => s.startTime === startTime);
        if (!slot || slot.status !== 'available') return;

        const prevSlots = selectionByKey[cacheKey]?.[courtId] ?? [];

        const idx = prevSlots.indexOf(startTime);
        if (idx !== -1) {
            // Tap on already-selected slot → deselect from here onwards
            setCourtSlots(courtId, prevSlots.slice(0, idx));
            return;
        }

        // Append if adjacent to last selected slot on this court
        const lastSlot = allSlots.find(
            (s) => s.startTime === prevSlots[prevSlots.length - 1],
        );
        const newSlots =
            !prevSlots.length || !lastSlot || lastSlot.endTime === startTime
                ? [...prevSlots, startTime]
                : [startTime]; // non-adjacent → restart from this slot

        setCourtSlots(courtId, newSlots);
    };

    const clearCurrentDate = () => {
        setSelectionByKey((prev) => {
            const next = { ...prev };
            delete next[cacheKey];
            return next;
        });
    };

    const clearAllDates = () => setSelectionByKey({});

    const handleShare = async () => {
        if (!facility) return;
        const formattedDate = format(selectedDate, 'EEEE, d MMMM yyyy');
        const mapsLink =
            facility.latitude && facility.longitude
                ? `https://maps.google.com/?q=${facility.latitude},${facility.longitude}`
                : `https://maps.google.com/?q=${encodeURIComponent(`${facility.name} ${facility.city}`)}`;

        const courtNames = filteredCourts.map((c) => c.name).join('  ');
        const rows = timeLabels.map((time) => {
            const dots = filteredCourts
                .map((c) => {
                    const slot = (courtSlotsData[c.id] ?? []).find(
                        (s) => s.startTime === time,
                    );
                    return slot?.status === 'available' ? '🟩' : '🟥';
                })
                .join('  ');
            return `${dots}  ${formatTime(time)}`;
        });

        const lines = [
            `🏟️ ${facility.name} — Court Availability`,
            `📅 ${formattedDate}`,
            `🎾 Sport: ${selectedSport}`,
            ``,
            `     ${courtNames}`,
            ...rows,
            ``,
            `🟩 Available  🟥 Booked`,
            ``,
            `📍 ${facility.city}`,
            `🗺️ Directions: ${mapsLink}`,
            ``,
            `👉 Book now: ${window.location.href}`,
            ``,
            `See you on the court! 🏆`,
        ];

        setIsSharing(true);
        try {
            if (navigator.share) {
                await navigator.share({
                    title: `🏟️ ${facility.name} — Availability`,
                    text: lines.join('\n'),
                });
            } else {
                await navigator.clipboard.writeText(lines.join('\n'));
                toast.success('Availability copied to clipboard!');
            }
        } catch {
            // user cancelled — ignore
        } finally {
            setIsSharing(false);
        }
    };

    const handleReviewBooking = async () => {
        if (!getToken()) {
            setLoginOpen(true);
            return;
        }
        if (allDateEntries.length === 0 || anyBelowMinimum) return;

        setHoldLoading(true);
        try {
            const holdResults = await Promise.all(
                allDateEntries.map(({ date, courtId, slotObjs }) =>
                    holdSlot({
                        courtId,
                        bookingDate: date,
                        slots: slotObjs.map((s) => ({
                            startTime: s.startTime,
                            endTime: s.endTime,
                        })),
                    }),
                ),
            );

            if (allDateEntries.length === 1) {
                // Single date — existing ConfirmBooking flow
                const { booking } = holdResults[0].data;
                const entry = allDateEntries[0];
                navigate('/confirm-booking', {
                    state: {
                        holdId: booking.id,
                        venueId: facilityId,
                        venueName: facility!.name,
                        venueAddress: [facility!.city, facility!.address]
                            .filter(Boolean)
                            .join(', '),
                        sport: selectedSport,
                        bookingDate: entry.date,
                        courtName: entry.courtData!.name,
                        slots: entry.slotObjs,
                        totalPrice: Number(booking.totalAmount),
                        discountAmount: Number(booking.discountAmount ?? 0),
                        finalAmount: Number(booking.finalAmount),
                        createdAt: booking.createdAt,
                        latitude: facility!.latitude ?? null,
                        longitude: facility!.longitude ?? null,
                    },
                });
            } else {
                // Multi-date — new MultiConfirmBooking flow
                const holds = holdResults.map((res, i) => {
                    const { booking } = res.data;
                    const entry = allDateEntries[i];
                    return {
                        holdId: booking.id,
                        bookingDate: entry.date,
                        courtName: entry.courtData!.name,
                        slots: entry.slotObjs,
                        totalPrice: Number(booking.totalAmount),
                        discountAmount: Number(booking.discountAmount ?? 0),
                        finalAmount: Number(booking.finalAmount),
                        createdAt: booking.createdAt,
                    };
                });
                navigate('/multi-confirm-booking', {
                    state: {
                        holds,
                        venueId: facilityId,
                        venueName: facility!.name,
                        venueAddress: [facility!.city, facility!.address]
                            .filter(Boolean)
                            .join(', '),
                        sport: selectedSport,
                        latitude: facility!.latitude ?? null,
                        longitude: facility!.longitude ?? null,
                    },
                });
            }
        } catch {
            toast.error('Could not hold slot. Please try again.');
        } finally {
            setHoldLoading(false);
        }
    };

    // ── Render guards ────────────────────────────────────────────────────────
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

    // ── JSX ──────────────────────────────────────────────────────────────────
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
                    <p className="text-xs opacity-80">Select Court &amp; Time</p>
                </div>
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
                    onSelect={setSelectedDate}
                    markedDates={markedDates}
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
                                    <div className="w-14 shrink-0 text-xs text-muted-foreground font-medium">
                                        {formatTime(time)}
                                    </div>
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
                                        const isDowntime =
                                            slot.status === 'downtime';
                                        const isSelected =
                                            (
                                                selectionByKey[cacheKey]?.[c.id] ?? []
                                            ).includes(slot.startTime);
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
                                                    isDowntime &&
                                                        'bg-orange-50 text-orange-500 border-orange-200 cursor-not-allowed dark:bg-orange-950/20 dark:text-orange-400',
                                                    !isAvailable &&
                                                        !isHeld &&
                                                        !isDowntime &&
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
                                                                      : isDowntime
                                                                        ? 'Closed'
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

            {/* ── Sticky booking summary bar ────────────────────────────── */}
            {grandTotalSlots > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50">
                    {/* Multi-entry chips (multi-date OR multi-court on same day) */}
                    {allDateEntries.length > 1 && (
                        <div className="mx-auto max-w-lg px-4 pt-2 flex items-center gap-2 flex-wrap">
                            {allDateEntries.map((entry) => (
                                <span
                                    key={`${entry.date}-${entry.courtId}`}
                                    className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                                >
                                    <CalendarDays className="h-3 w-3" />
                                    {format(new Date(entry.date), 'dd MMM')}
                                    {' · '}
                                    {entry.courtData?.name ?? entry.courtId}
                                    {' · '}
                                    {entry.slotObjs.length} slot
                                    {entry.slotObjs.length > 1 ? 's' : ''}
                                </span>
                            ))}
                            <button
                                onClick={clearAllDates}
                                className="ml-auto text-xs text-muted-foreground hover:text-destructive transition-colors"
                            >
                                Clear all
                            </button>
                        </div>
                    )}

                    <div className="mx-auto max-w-lg px-4 py-3 flex items-center gap-3">
                        {/* Clear current date */}
                        <button
                            onClick={clearCurrentDate}
                            className="rounded-full p-1.5 bg-muted hover:bg-muted/80 shrink-0"
                        >
                            <X className="h-4 w-4 text-muted-foreground" />
                        </button>

                        <div className="flex-1 min-w-0">
                            {allDateEntries.length > 1 ? (
                                <>
                                    <p className="font-semibold text-sm">
                                        {grandTotalSlots} slots &middot;{' '}
                                        {allDateEntries.length} bookings &middot; ₹
                                        {grandTotalPrice}
                                    </p>
                                    {anyBelowMinimum && (
                                        <p className="text-xs text-destructive">
                                            Some selections below min.{' '}
                                            {minimumSlotMinutes} min
                                        </p>
                                    )}
                                </>
                            ) : (
                                <>
                                    <p className="font-semibold text-sm">
                                        {grandTotalSlots} slot
                                        {grandTotalSlots > 1 ? 's' : ''} · ₹
                                        {grandTotalPrice}
                                    </p>
                                    {belowMinimumCurrent ? (
                                        <p className="text-xs text-destructive">
                                            Min. booking is{' '}
                                            {minimumSlotMinutes} min (
                                            {currentDurationMinutes} min
                                            selected)
                                        </p>
                                    ) : (
                                        <p className="text-xs text-muted-foreground truncate">
                                            {selectedSlotObjects[0]
                                                ? formatTime(
                                                      selectedSlotObjects[0]
                                                          .startTime,
                                                  )
                                                : ''}{' '}
                                            –{' '}
                                            {selectedSlotObjects[
                                                selectedSlotObjects.length - 1
                                            ]
                                                ? formatTime(
                                                      selectedSlotObjects[
                                                          selectedSlotObjects.length -
                                                              1
                                                      ].endTime,
                                                  )
                                                : ''}
                                        </p>
                                    )}
                                </>
                            )}
                        </div>

                        <Button
                            onClick={handleReviewBooking}
                            disabled={holdLoading || anyBelowMinimum}
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

            {/* Login modal */}
            <PhoneLoginModal
                open={loginOpen}
                onOpenChange={setLoginOpen}
                onSuccess={() => handleReviewBooking()}
            />
        </div>
    );
};

export default Booking;
