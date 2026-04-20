import { useLocation, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { formatTime } from '../../utils/twMerge';

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
    latitude?: number | null;
    longitude?: number | null;
}

const BookingSuccess = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const state = location.state as BookingSuccessState | null;

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
        latitude,
        longitude,
    } = state;

    const formattedDate = format(new Date(bookingDate), 'EEEE, d MMMM yyyy');
    const timeRange = `${formatTime(startTime)} – ${formatTime(endTime)}`;

    // ── Build Google Maps link ──────────────────────────────────────────────
    const mapsLink =
        latitude && longitude
            ? `https://maps.google.com/?q=${latitude},${longitude}`
            : `https://maps.google.com/?q=${encodeURIComponent(`${venueName} ${venueAddress}`)}`;

    // ── Native share ────────────────────────────────────────────────────────
    const handleShare = async () => {
        const lines = [
            `🎉 Just booked a court at ${venueName}!`,
            ``,
            `🏅 Sport: ${sport}`,
            `🏟️ Court: ${courtName}`,
            `📅 Date: ${formattedDate}`,
            `⏰ Time: ${timeRange}`,
            `📍 Location: ${mapsLink}`,
            ``,
            `🔗 Book yours: ${window.location.origin}/venue/${state.venueId}`,
            ``,
            `See you on the court! 🏆`,
        ];
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
            <div className="bg-primary px-6 pt-16 pb-10 text-primary-foreground flex flex-col items-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-foreground/15">
                    <CheckCircle2 className="h-9 w-9" />
                </div>
                <h1 className="text-2xl font-bold">Booking Confirmed!</h1>
                <p className="mt-1 text-sm text-primary-foreground/70">
                    Ref:{' '}
                    <span className="font-semibold text-primary-foreground">
                        {bookingRef}
                    </span>
                </p>
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
                                <p className="text-xs text-muted-foreground">
                                    Venue
                                </p>
                                <p className="font-semibold text-foreground text-sm">
                                    {venueName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {venueAddress}
                                </p>
                            </div>
                        </div>

                        {/* Sport + Court */}
                        <div className="flex items-start gap-3 px-4 py-3.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                <Dumbbell className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">
                                    Sport &amp; Court
                                </p>
                                <p className="font-semibold text-foreground text-sm">
                                    {sport}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {courtName}
                                </p>
                            </div>
                        </div>

                        {/* Date */}
                        <div className="flex items-start gap-3 px-4 py-3.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                <CalendarCheck className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">
                                    Date
                                </p>
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
                                <p className="text-xs text-muted-foreground">
                                    Time
                                </p>
                                <p className="font-semibold text-foreground text-sm">
                                    {timeRange}
                                </p>
                            </div>
                        </div>

                        {/* Amount */}
                        <div className="flex items-center justify-between px-4 py-3.5">
                            <p className="text-sm font-medium text-muted-foreground">
                                Total Paid
                            </p>
                            <p className="text-base font-bold text-foreground">
                                ₹{totalPrice.toLocaleString('en-IN')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Actions ── */}
            <div className="mx-auto w-full max-w-sm px-4 mt-5 space-y-3">
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
                    onClick={() => navigate('/my-bookings', { replace: true })}
                >
                    <ListOrdered className="h-4 w-4" />
                    View My Bookings
                </Button>

                {/* Home */}
                <Button
                    variant="ghost"
                    className="w-full gap-2 text-muted-foreground"
                    onClick={() => navigate('/', { replace: true })}
                >
                    <Home className="h-4 w-4" />
                    Back to Home
                </Button>
            </div>
        </div>
    );
};

export default BookingSuccess;
