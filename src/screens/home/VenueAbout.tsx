import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    ArrowLeft,
    MapPin,
    ExternalLink,
    Clock,
    Shield,
    RefreshCw,
    Zap,
    Check,
} from 'lucide-react';
import { Separator } from '../../components/ui/separator';
import { getVenueDetail } from '../../api/adapters/venues';
import { formatTime } from '../../utils/twMerge';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function VenueAbout() {
    const { venueId } = useParams();
    const navigate = useNavigate();

    const { data, isLoading } = useQuery({
        queryKey: ['venue', venueId],
        queryFn: () => getVenueDetail(venueId!),
        enabled: !!venueId,
    });

    const facility = data?.data?.venue;

    const location = facility
        ? [facility.address, facility.city].filter(Boolean).join(', ')
        : '';

    const mapsUrl = facility
        ? facility.latitude && facility.longitude
            ? `https://maps.google.com/?q=${facility.latitude},${facility.longitude}`
            : `https://maps.google.com/?q=${encodeURIComponent(location)}`
        : '#';

    const mapEmbedSrc = facility
        ? facility.latitude && facility.longitude
            ? `https://maps.google.com/maps?q=${facility.latitude},${facility.longitude}&z=15&output=embed`
            : `https://maps.google.com/maps?q=${encodeURIComponent(location)}&z=14&output=embed`
        : '';

    const venueHours = (facility?.venueHours ?? []).map((h) => ({
        day: DAY_NAMES[h.dayOfWeek],
        time: h.isClosed
            ? 'Closed'
            : `${formatTime(h.openTime)} – ${formatTime(h.closeTime)}`,
    }));

    const cancellationPolicy = facility?.bookingPolicy?.cancellationPolicy ?? '';
    const minimumNotice = facility?.bookingPolicy?.minimumNoticeMinutes ?? 0;
    const advanceDays = facility?.bookingPolicy?.adavanceBookingDays ?? 0;
    const autoConfirm = facility?.bookingPolicy?.autoConfirm ?? false;

    return (
        <div className="min-h-screen bg-background pb-10">
            {/* Top bar */}
            <div className="sticky top-0 z-10 bg-[linear-gradient(90deg,rgba(38,117,148,1)_0%,rgba(16,45,69,1)_70%)]">
                <div className="mx-auto max-w-lg px-4 py-3 flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="rounded-full hover:bg-white/10 p-1.5 -ml-1.5 transition-colors"
                        aria-label="Back to venue"
                    >
                        <ArrowLeft className="h-5 w-5 text-white" />
                    </button>
                    <div className="min-w-0">
                        <p className="text-[11px] font-medium text-white/60 uppercase tracking-wider">
                            About
                        </p>
                        {isLoading ? (
                            <div className="h-4 w-32 animate-pulse rounded bg-white/20 mt-0.5" />
                        ) : (
                            <h1 className="text-base font-bold text-white truncate">
                                {facility?.name ?? ''}
                            </h1>
                        )}
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-lg px-4 pt-5 space-y-6">
                {/* Map card */}
                {mapEmbedSrc && (
                    <section>
                        <div className="rounded-2xl border bg-card overflow-hidden">
                            <div className="aspect-[16/10] w-full bg-muted">
                                <iframe
                                    title={`Map of ${facility?.name}`}
                                    src={mapEmbedSrc}
                                    className="h-full w-full border-0"
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                />
                            </div>
                            <button
                                onClick={() => window.open(mapsUrl, '_blank')}
                                className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-accent/40 transition-colors"
                            >
                                <div className="flex items-start gap-2 min-w-0">
                                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                    <p className="text-sm text-foreground leading-snug">
                                        {location}
                                    </p>
                                </div>
                                <div className="inline-flex items-center gap-1 text-xs font-semibold text-primary shrink-0">
                                    Directions
                                    <ExternalLink className="h-3 w-3" />
                                </div>
                            </button>
                        </div>
                    </section>
                )}

                {/* Description */}
                {facility?.description && (
                    <section>
                        <h2 className="text-sm font-semibold text-foreground mb-2">
                            About the venue
                        </h2>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                            {facility.description}
                        </p>
                    </section>
                )}

                {/* Amenities + Hours + Policies */}
                <section className="rounded-2xl border bg-card overflow-hidden">
                    {/* Amenities */}
                    {facility?.venueAmenities && facility.venueAmenities.length > 0 && (
                        <>
                            <div className="p-4">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                                    Amenities
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {facility.venueAmenities.map((a) => (
                                        <span
                                            key={a.name}
                                            className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground"
                                        >
                                            {a.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <Separator />
                        </>
                    )}

                    {/* Hours */}
                    {venueHours.length > 0 && (
                        <>
                            <div className="p-4">
                                <div className="flex items-center gap-1.5 mb-2.5">
                                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Hours
                                    </p>
                                </div>
                                <div className="space-y-1.5">
                                    {venueHours.map((h, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center justify-between text-sm"
                                        >
                                            <span className="text-muted-foreground">
                                                {h.day}
                                            </span>
                                            <span className="font-medium text-foreground">
                                                {h.time}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <Separator />
                        </>
                    )}

                    {/* Policies */}
                    <div className="p-4 space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Policies
                        </p>
                        <div className="space-y-3">
                            {cancellationPolicy && (
                                <div className="flex items-start gap-2">
                                    <Shield className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs font-semibold text-foreground">
                                            Cancellation
                                        </p>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            {cancellationPolicy}
                                        </p>
                                    </div>
                                </div>
                            )}
                            {minimumNotice > 0 && (
                                <div className="flex items-start gap-2">
                                    <RefreshCw className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs font-semibold text-foreground">
                                            Minimum notice
                                        </p>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            {minimumNotice >= 60
                                                ? `${Math.round(minimumNotice / 60)} hour${Math.round(minimumNotice / 60) !== 1 ? 's' : ''} before session`
                                                : `${minimumNotice} minutes before session`}
                                        </p>
                                    </div>
                                </div>
                            )}
                            {advanceDays > 0 && (
                                <div className="flex items-start gap-2">
                                    <Zap className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-xs font-semibold text-foreground">
                                            Advance booking
                                        </p>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            Book up to {advanceDays} days in advance
                                        </p>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-start gap-2">
                                <Check className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs font-semibold text-foreground">
                                        Confirmation
                                    </p>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        {autoConfirm
                                            ? 'Bookings confirmed instantly upon payment'
                                            : 'Bookings require venue confirmation after payment'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {!isLoading && !facility && (
                    <p className="text-center text-sm text-muted-foreground py-10">
                        Venue not found.
                    </p>
                )}
            </div>
        </div>
    );
}
