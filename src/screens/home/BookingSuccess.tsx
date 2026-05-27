import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';

const SPORT_DISPLAY: Record<string, string> = {
    TENNIS: 'Tennis',
    FOOTBALL: 'Football',
    BADMINTON: 'Badminton',
    TABLE_TENNIS: 'Table Tennis',
    SQUASH: 'Squash',
    RIFLE_SHOOTING: 'Rifle Shooting',
    BOX_CRICKET: 'Box Cricket',
    CRICKET: 'Cricket',
    PADEL: 'Padel',
    PICKLEBALL: 'Pickleball',
    PICKELBALL: 'Pickleball',
};
import { format } from 'date-fns';
import {
    CalendarCheck,
    MapPin,
    Share2,
    CheckCircle2,
    Clock,
    Dumbbell,
    Home,
    ListOrdered,
    Receipt,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { formatTime } from '../../utils/twMerge';
import { BookingReceiptModal } from '../../components/BookingReceiptModal';

interface BookingEntry {
    bookingRef: string;
    courtName: string;
    bookingDate: string;
    startTime: string;
    endTime: string;
    pointsAmount: number;
}

interface BookingSuccessState {
    bookingRef: string;
    venueName: string;
    venueAddress: string;
    venueId: string;
    sport: string;
    courtName: string;
    bookingDate: string; // 'yyyy-MM-dd'
    startTime: string; // 'HH:mm'
    endTime: string; // 'HH:mm'
    totalPrice: number;
    paymentMode?: 'POINTS';
    pointsAmount?: number;
    venueSlug?: string | null;
    brandColor?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    // Multi-court fields
    bookings?: BookingEntry[];
    totalPointsAmount?: number;
}

const BookingSuccess = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const state = location.state as BookingSuccessState | null;
    const [receiptOpen, setReceiptOpen] = useState(false);

    if (!state) {
        navigate('/my-bookings', { replace: true });
        return null;
    }

    const {
        bookingRef,
        venueName,
        venueAddress,
        sport,
        courtName,
        bookingDate,
        startTime,
        endTime,
        totalPrice,
        paymentMode,
        pointsAmount,
        latitude,
        longitude,
        bookings,
        totalPointsAmount,
    } = state;

    const isPointsBooking = paymentMode === 'POINTS';
    const accentColor = state.brandColor ?? undefined;
    const isMulti = bookings && bookings.length > 1;

    const formattedDate = format(new Date(bookingDate), 'EEEE, d MMMM yyyy');
    const timeRange = `${formatTime(startTime)} – ${formatTime(endTime)}`;

    const displayPoints = isMulti
        ? (totalPointsAmount ?? bookings.reduce((n, b) => n + b.pointsAmount, 0))
        : (pointsAmount ?? 0);

    // ── Build Google Maps link ──────────────────────────────────────────────
    const mapsLink =
        latitude && longitude
            ? `https://maps.google.com/?q=${latitude},${longitude}`
            : `https://maps.google.com/?q=${encodeURIComponent(`${venueName} ${venueAddress}`)}`;

    // ── Native share ────────────────────────────────────────────────────────
    const handleShare = async () => {
        const lines: string[] = [
            `Booking Confirmed at ${venueName}`,
            ``,
            `Sport: ${sport}`,
        ];

        if (isMulti) {
            bookings.forEach((b) => {
                lines.push(
                    `Court: ${b.courtName}`,
                    `Date: ${format(new Date(b.bookingDate), 'EEEE, d MMMM yyyy')}`,
                    `Time: ${formatTime(b.startTime)} – ${formatTime(b.endTime)}`,
                    ``,
                );
            });
        } else {
            lines.push(
                `Court: ${courtName}`,
                `Date: ${formattedDate}`,
                `Time: ${timeRange}`,
                ``,
            );
        }

        lines.push(`Location:`, `${venueName}, ${venueAddress}`, mapsLink);

        const text = lines.join('\n');
        if (navigator.share) {
            try {
                await navigator.share({ title: '🎉 Booking Confirmed!', text });
            } catch {
                // user cancelled — ignore
            }
        } else {
            await navigator.clipboard.writeText(text);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* ── Hero ── */}
            <div
                className="px-6 pt-16 pb-10 text-white flex flex-col items-center text-center"
                style={{ background: accentColor ?? 'hsl(var(--primary))' }}
            >
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-foreground/15">
                    <CheckCircle2 className="h-9 w-9" />
                </div>
                <h1 className="text-2xl font-bold">
                    {isMulti ? `${bookings.length} Bookings Confirmed!` : 'Booking Confirmed!'}
                </h1>
                {!isMulti && (
                    <p className="mt-1 text-sm text-primary-foreground/70">
                        Ref:{' '}
                        <span className="font-semibold text-primary-foreground">
                            {bookingRef}
                        </span>
                    </p>
                )}
            </div>

            {/* ── Details card ── */}
            <div className="mx-auto w-full max-w-sm px-4 -mt-4">
                <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                    <div className="divide-y divide-border">
                        {/* Venue */}
                        <div className="flex items-start gap-3 px-4 py-3.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                <MapPin className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground">Venue</p>
                                <p className="font-semibold text-foreground text-sm">
                                    {venueName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {venueAddress}
                                </p>
                            </div>
                        </div>

                        {/* Sport & Court */}
                        <div className="flex items-start gap-3 px-4 py-3.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                <Dumbbell className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">
                                    {isMulti ? 'Sport' : 'Sport & Court'}
                                </p>
                                <p className="font-semibold text-foreground text-sm">
                                    {!isMulti
                                        ? `${SPORT_DISPLAY[sport] ?? sport} · ${courtName}`
                                        : (SPORT_DISPLAY[sport] ?? sport)}
                                </p>
                            </div>
                        </div>

                        {isMulti ? (
                            /* ── Multi-court: one row per booking ── */
                            bookings.map((b, i) => (
                                <div key={i} className="px-4 py-3.5 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-semibold text-foreground">
                                            {SPORT_DISPLAY[sport] ?? sport} · {b.courtName}
                                        </p>
                                        <p className="text-xs font-medium text-primary">
                                            {b.pointsAmount.toLocaleString()} pts
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <CalendarCheck className="h-3.5 w-3.5 shrink-0" />
                                        {format(new Date(b.bookingDate), 'EEE, d MMM yyyy')}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <Clock className="h-3.5 w-3.5 shrink-0" />
                                        {formatTime(b.startTime)} – {formatTime(b.endTime)}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground/60">
                                        Ref: {b.bookingRef}
                                    </p>
                                </div>
                            ))
                        ) : (
                            /* ── Single booking: original layout ── */
                            <>
                                {/* Date */}
                                <div className="flex items-start gap-3 px-4 py-3.5">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                        <CalendarCheck className="h-4 w-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Date</p>
                                        <p className="font-semibold text-foreground text-sm">
                                            {formattedDate}
                                        </p>
                                    </div>
                                </div>

                                {/* Time */}
                                <div className="flex items-start gap-3 px-4 py-3.5">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                        <Clock className="h-4 w-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Time</p>
                                        <p className="font-semibold text-foreground text-sm">
                                            {timeRange}
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Amount */}
                        <div className="flex items-center justify-between px-4 py-3.5">
                            <p className="text-sm font-medium text-muted-foreground">
                                {isPointsBooking ? 'Points Deducted' : 'Total Paid'}
                            </p>
                            <p className="text-base font-bold text-foreground">
                                {isPointsBooking
                                    ? `${displayPoints.toLocaleString()} pts`
                                    : `₹${totalPrice.toLocaleString('en-IN')}`}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Actions ── */}
            <div className="mx-auto w-full max-w-sm px-4 mt-5 space-y-3">
                {/* Receipt — only for single bookings */}
                {!isMulti && (
                    <Button
                        variant="outline"
                        className="w-full gap-2"
                        size="lg"
                        onClick={() => setReceiptOpen(true)}
                    >
                        <Receipt className="h-4 w-4" />
                        View Receipt
                    </Button>
                )}

                {/* Share */}
                <Button
                    className="w-full gap-2"
                    size="lg"
                    onClick={handleShare}
                >
                    <Share2 className="h-4 w-4" />
                    Share Booking
                </Button>

                {/* My Bookings */}
                <Button
                    variant="outline"
                    className="w-full gap-2"
                    size="lg"
                    onClick={() => {
                        if (isPointsBooking && state.venueSlug) {
                            navigate(`/club/${state.venueSlug}/bookings`, { replace: true });
                        } else {
                            navigate('/my-bookings', { replace: true });
                        }
                    }}
                >
                    <ListOrdered className="h-4 w-4" />
                    View My Bookings
                </Button>

                {/* Home */}
                <Button
                    variant="ghost"
                    className="w-full gap-2 text-muted-foreground"
                    onClick={() => {
                        if (isPointsBooking && state.venueSlug) {
                            navigate(`/club/${state.venueSlug}`, { replace: true });
                        } else {
                            navigate('/', { replace: true });
                        }
                    }}
                >
                    <Home className="h-4 w-4" />
                    Back to Home
                </Button>
            </div>

            {!isMulti && (
                <BookingReceiptModal
                    open={receiptOpen}
                    onClose={() => setReceiptOpen(false)}
                    data={{
                        bookingRef,
                        venueName,
                        venueAddress,
                        sport,
                        courtName,
                        bookingDate,
                        startTime,
                        endTime,
                        totalAmount: totalPrice,
                        finalAmount: totalPrice,
                        paymentMode: paymentMode ?? 'RUPEE',
                        pointsAmount: pointsAmount,
                        bookedAt: new Date().toISOString(),
                    }}
                />
            )}
        </div>
    );
};

export default BookingSuccess;
