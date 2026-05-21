import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Clock } from 'lucide-react';
import { useClub, remainingCredits } from './ClubContext';
import { getVenueDetail } from '../../api/adapters/venues';
import { getCourtDetail } from '../../api/adapters/courts';
import { nextDays, type ClubSlot } from './mock-club';

const SPORT_DISPLAY: Record<string, { name: string; unit: string }> = {
    TENNIS: { name: 'Tennis', unit: 'courts' },
    FOOTBALL: { name: 'Football', unit: 'pitches' },
    BADMINTON: { name: 'Badminton', unit: 'courts' },
    TABLE_TENNIS: { name: 'Table Tennis', unit: 'tables' },
    SQUASH: { name: 'Squash', unit: 'courts' },
    RIFLE_SHOOTING: { name: 'Rifle Shooting', unit: 'lanes' },
    BOX_CRICKET: { name: 'Box Cricket', unit: 'arena' },
    CRICKET: { name: 'Cricket', unit: 'pitches' },
    PADEL: { name: 'Padel', unit: 'courts' },
    PICKLEBALL: { name: 'Pickleball', unit: 'courts' },
};

function isPeakSlot(startTime: string, peakPricings: ApiPeakHourPricing[]): boolean {
    return peakPricings.some(
        (p) => p.isActive && startTime >= p.startTime && startTime < p.endTime,
    );
}

function getSlotCredits(startTime: string, court: ApiCourt): number {
    const peak = court.peakHourPricings?.find(
        (p) =>
            p.isActive &&
            p.pointsPerSlot != null &&
            startTime >= p.startTime &&
            startTime < p.endTime,
    );
    if (peak?.pointsPerSlot != null) return peak.pointsPerSlot;
    return court.courtPricings[0]?.pointsPerSlot ?? 0;
}

function apiSlotsToClubSlots(
    apiSlots: ApiSlot[],
    court: ApiCourt,
    date: string,
): ClubSlot[] {
    return apiSlots
        .filter((s) => s.status !== 'downtime' && s.status !== 'blocked')
        .map((s) => ({
            id: `${court.id}-${date}-${s.startTime}`,
            courtId: court.id,
            courtName: court.name,
            date,
            startTime: s.startTime,
            endTime: s.endTime,
            credits: getSlotCredits(s.startTime, court),
            isPeak: isPeakSlot(s.startTime, court.peakHourPricings ?? []),
            status: s.status === 'available' ? ('available' as const) : ('booked' as const),
        }));
}

export default function ClubBookSport() {
    const { venueId, sport: sportKey } = useParams();
    const navigate = useNavigate();
    const { setPending, member } = useClub();

    const days = useMemo(() => nextDays(7), []);
    const [date, setDate] = useState(days[0].date);
    const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
    const [picked, setPicked] = useState<ClubSlot[]>([]);

    const { data: venueData } = useQuery({
        queryKey: ['venue', venueId],
        queryFn: () => getVenueDetail(venueId!),
        enabled: !!venueId,
    });

    const courts: ApiCourt[] = venueData?.data?.courtsBySport?.[sportKey ?? ''] ?? [];
    const activeCourt = courts.find((c) => c.id === selectedCourtId) ?? courts[0] ?? null;
    const activeCourtId = activeCourt?.id ?? null;

    const { data: courtData, isLoading: slotsLoading } = useQuery({
        queryKey: ['court-detail', activeCourtId, date],
        queryFn: () => getCourtDetail(activeCourtId!, date),
        enabled: !!activeCourtId,
    });

    const slots = useMemo(() => {
        if (!activeCourt || !courtData?.data?.availability) return [];
        const { session1, session2 } = courtData.data.availability;
        return apiSlotsToClubSlots(
            [...session1, ...(session2 ?? [])],
            activeCourt,
            date,
        );
    }, [activeCourt, courtData, date]);

    const display = SPORT_DISPLAY[sportKey ?? ''] ?? { name: sportKey ?? '', unit: 'courts' };
    const totalCredits = picked.reduce((s, p) => s + p.credits, 0);
    const remaining = remainingCredits(member);
    const overBudget = totalCredits > remaining;

    function toggle(slot: ClubSlot) {
        if (slot.status !== 'available') return;
        setPicked((cur) => {
            const exists = cur.find((s) => s.id === slot.id);
            if (exists) return cur.filter((s) => s.id !== slot.id);
            return [...cur, slot].sort((a, b) =>
                a.startTime.localeCompare(b.startTime),
            );
        });
    }

    function changeCourt(courtId: string) {
        setSelectedCourtId(courtId);
        setPicked([]);
    }

    function changeDate(d: string) {
        setDate(d);
        setPicked([]);
    }

    function proceed() {
        if (!picked.length || overBudget) return;
        setPending({
            sportId: sportKey!,
            date,
            slots: picked,
            totalCredits,
        });
        navigate(`/club/${venueId}/book/${sportKey}/confirm`);
    }

    return (
        <div className="pb-32">
            {/* Top bar */}
            <div className="sticky top-0 z-40 border-b border-[hsl(var(--club-border))] bg-[hsl(var(--club-surface))]/95 backdrop-blur">
                <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-3">
                    <Link
                        to={`/club/${venueId}`}
                        className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[hsl(var(--club-bg))]"
                        aria-label="Back to club"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div className="flex-1">
                        <h1 className="font-serif text-xl font-semibold leading-none">
                            {display.name}
                        </h1>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[hsl(var(--club-muted))]">
                            <span>
                                {courts.length} {display.unit}
                            </span>
                            {courtData?.data?.availability &&
                                !courtData.data.availability.isClosed && (
                                    <>
                                        <span>·</span>
                                        <Clock className="h-3 w-3" />
                                        <span>
                                            {slots[0]?.startTime ?? ''}–
                                            {slots[slots.length - 1]?.endTime ?? ''}
                                        </span>
                                    </>
                                )}
                        </p>
                    </div>
                    <div className="rounded-full bg-[hsl(var(--club-accent))]/10 px-3 py-1 text-sm font-semibold text-[hsl(var(--club-accent))]">
                        {remaining.toLocaleString()} cr
                    </div>
                </div>
            </div>

            <main className="mx-auto max-w-3xl px-5 pt-5">
                {/* Date strip */}
                <section>
                    <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-[hsl(var(--club-muted))]">
                        Date
                    </h2>
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                        {days.map((d) => {
                            const active = d.date === date;
                            return (
                                <button
                                    key={d.date}
                                    onClick={() => changeDate(d.date)}
                                    className={`flex min-w-[68px] flex-col items-center rounded-xl border px-3 py-2 transition-colors ${
                                        active
                                            ? 'border-[hsl(var(--club-accent))] bg-[hsl(var(--club-accent))] text-[hsl(var(--club-accent-foreground))]'
                                            : 'border-[hsl(var(--club-border))] bg-[hsl(var(--club-surface))]'
                                    }`}
                                >
                                    <span className="text-[11px] font-medium uppercase tracking-wider">
                                        {d.label}
                                    </span>
                                    <span className="mt-0.5 text-sm font-semibold">
                                        {d.sub}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Court selector */}
                {courts.length > 0 && (
                    <section className="mt-6">
                        <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-[hsl(var(--club-muted))]">
                            {display.unit === 'arena'
                                ? 'Arena'
                                : display.unit === 'tables'
                                  ? 'Table'
                                  : display.unit === 'lanes'
                                    ? 'Lane'
                                    : 'Court'}
                        </h2>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {courts.map((c) => {
                                const active = c.id === (activeCourtId);
                                return (
                                    <button
                                        key={c.id}
                                        onClick={() => changeCourt(c.id)}
                                        className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                                            active
                                                ? 'border-[hsl(var(--club-ink))] bg-[hsl(var(--club-ink))] text-[hsl(var(--club-surface))]'
                                                : 'border-[hsl(var(--club-border))] bg-[hsl(var(--club-surface))] text-[hsl(var(--club-ink))]'
                                        }`}
                                    >
                                        {c.name}
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Time grid */}
                <section className="mt-6">
                    <div className="flex items-baseline justify-between">
                        <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-[hsl(var(--club-muted))]">
                            Times · 30-min slots
                        </h2>
                        <div className="flex items-center gap-3 text-[11px] text-[hsl(var(--club-muted))]">
                            <span className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-[hsl(var(--club-border))]" />
                                Off-peak
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-[hsl(var(--club-accent))]" />
                                Peak
                            </span>
                        </div>
                    </div>

                    {slotsLoading ? (
                        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                            {[...Array(12)].map((_, i) => (
                                <div
                                    key={i}
                                    className="h-16 animate-pulse rounded-xl bg-[hsl(var(--club-border))]"
                                />
                            ))}
                        </div>
                    ) : courtData?.data?.availability?.isClosed ? (
                        <p className="mt-4 text-sm text-[hsl(var(--club-muted))]">
                            Closed on this day.
                        </p>
                    ) : (
                        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                            {slots.map((slot) => {
                                const isPicked = !!picked.find(
                                    (p) => p.id === slot.id,
                                );
                                const disabled = slot.status === 'booked';
                                return (
                                    <button
                                        key={slot.id}
                                        disabled={disabled}
                                        onClick={() => toggle(slot)}
                                        className={`relative flex flex-col items-start rounded-xl border px-3 py-2.5 text-left transition-all ${
                                            disabled
                                                ? 'cursor-not-allowed border-dashed border-[hsl(var(--club-border))] bg-transparent text-[hsl(var(--club-muted))] opacity-50'
                                                : isPicked
                                                  ? 'border-[hsl(var(--club-accent))] bg-[hsl(var(--club-accent))]/10 ring-1 ring-[hsl(var(--club-accent))]'
                                                  : 'border-[hsl(var(--club-border))] bg-[hsl(var(--club-surface))] hover:border-[hsl(var(--club-ink))]'
                                        } ${slot.isPeak && !disabled && !isPicked ? 'border-[hsl(var(--club-accent))]/30' : ''}`}
                                    >
                                        <span className="text-sm font-semibold tabular-nums">
                                            {slot.startTime}
                                        </span>
                                        <span className="mt-0.5 text-[11px] text-[hsl(var(--club-muted))]">
                                            {disabled
                                                ? 'Booked'
                                                : `${slot.credits} cr`}
                                        </span>
                                        {slot.isPeak && !disabled && (
                                            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[hsl(var(--club-accent))]" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </section>
            </main>

            {/* Sticky bottom bar */}
            {picked.length > 0 && (
                <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[hsl(var(--club-border))] bg-[hsl(var(--club-surface))]/98 backdrop-blur">
                    <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-3">
                        <div className="flex-1">
                            <div className="text-sm font-semibold">
                                {picked.length} slot
                                {picked.length > 1 ? 's' : ''} ·{' '}
                                {picked.length * 30} min
                            </div>
                            <div className="text-[11px] text-[hsl(var(--club-muted))]">
                                {picked[0].courtName} · {picked[0].startTime}–
                                {picked[picked.length - 1].endTime}
                            </div>
                        </div>
                        <div className="text-right">
                            <div
                                className={`text-lg font-semibold tabular-nums ${
                                    overBudget ? 'text-destructive' : ''
                                }`}
                            >
                                {totalCredits} cr
                            </div>
                            {overBudget && (
                                <div className="text-[10px] text-destructive">
                                    Over balance
                                </div>
                            )}
                        </div>
                        <button
                            disabled={overBudget}
                            onClick={proceed}
                            className="rounded-xl bg-[hsl(var(--club-accent))] px-5 py-3 text-sm font-semibold text-[hsl(var(--club-accent-foreground))] disabled:opacity-50"
                        >
                            Continue
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
