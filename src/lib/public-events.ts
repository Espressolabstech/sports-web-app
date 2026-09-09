import {
    getEvents,
    getEventDetail,
    registerForEvent as apiRegisterForEvent,
    confirmEventPayment as apiConfirmEventPayment,
} from '../api/adapters/events';

export type EventSkill = 'Beginner' | 'Intermediate' | 'Advance';
export type EventPhase = 'upcoming' | 'live' | 'completed';
export type FillStatusValue = 'open' | 'filling' | 'full';

export interface RosterPlayer {
    id: string;
    name: string;
    skill: EventSkill;
    createdAt: string;
    isMe?: boolean;
}

export interface TournamentEvent {
    id: string;
    slug: string;
    title: string;
    description: string;
    venueName: string;
    venueLocation: string;
    sport: string;
    format: string;
    start: Date;
    end: Date;
    capacity: number;
    courts: number;
    roundMinutes: number;
    pointsPerRound: number;
    registrationClosesHours: number;
    skillLevels: EventSkill[];
    posterUrl: string;
    priceInr: number;
    phase: EventPhase;
    currentRound: number;
    totalRounds: number | null;
    completedCohorts: EventSkill[];
    roster: RosterPlayer[];
    rounds: ApiEventRound[];
    hosts: ApiEventHost[];
}

export interface EventRegistration {
    eventSlug: string;
    entrantId: string;
    name: string;
    phone: string;
    skill: EventSkill;
    ticketCode: string;
    waitlisted: boolean;
    createdAt: string;
}

const PHASE_TO_CLIENT: Record<string, EventPhase> = {
    PUBLISHED: 'upcoming',
    LIVE: 'live',
    COMPLETED: 'completed',
};

const SKILL_TO_CLIENT: Record<string, EventSkill> = {
    BEGINNER: 'Beginner',
    INTERMEDIATE: 'Intermediate',
    ADVANCED: 'Advance',
};

const SKILL_TO_API: Record<EventSkill, ApiEventEntrant['skill']> = {
    Beginner: 'BEGINNER',
    Intermediate: 'INTERMEDIATE',
    Advance: 'ADVANCED',
};

const combine = (dateISO: string, time: string) => new Date(`${dateISO}T${time}:00`);

const mapEvent = (e: ApiEvent): TournamentEvent => {
    const dateISO = String(e.eventDate).slice(0, 10);
    const start = combine(dateISO, e.time);
    const end = e.endTime ? combine(dateISO, e.endTime) : new Date(start.getTime() + 3 * 60 * 60 * 1000);

    return {
        id: e.id,
        slug: e.slug,
        title: e.title,
        description: e.description ?? '',
        venueName: e.venueName,
        venueLocation: e.venueArea || e.venueName,
        sport: e.sport,
        format: e.format,
        start,
        end,
        capacity: e.capacity,
        courts: e.courts,
        roundMinutes: e.roundMinutes,
        pointsPerRound: e.pointsPerRound,
        registrationClosesHours: e.registrationClosesHours,
        skillLevels: e.skillLevels.map((s) => SKILL_TO_CLIENT[s] ?? 'Intermediate'),
        posterUrl: e.posterUrl ?? '',
        priceInr: e.priceInr,
        phase: PHASE_TO_CLIENT[e.phase] ?? 'upcoming',
        currentRound: e.currentRound ?? 0,
        totalRounds: e.totalRounds ?? null,
        completedCohorts: (e.completedCohorts ?? []).map(
            (s) => SKILL_TO_CLIENT[s] ?? 'Intermediate',
        ),
        roster: e.entrants.map((p) => ({
            id: p.id,
            name: p.name,
            skill: SKILL_TO_CLIENT[p.skill] ?? 'Intermediate',
            createdAt: p.createdAt,
        })),
        rounds: e.rounds ?? [],
        hosts: e.hosts,
    };
};

export async function fetchEvents(): Promise<TournamentEvent[]> {
    const res = await getEvents();
    return res.data.events.map(mapEvent);
}

export async function fetchEvent(slug: string): Promise<TournamentEvent | null> {
    try {
        const res = await getEventDetail(slug);
        return mapEvent(res.data.event);
    } catch {
        return null;
    }
}

export function fillStatus(event: TournamentEvent) {
    const filled = event.roster.length;
    const pct = event.capacity > 0 ? Math.min(100, Math.round((filled / event.capacity) * 100)) : 0;
    const status: FillStatusValue = pct >= 100 ? 'full' : pct >= 60 ? 'filling' : 'open';
    const label = status === 'full' ? 'Full' : status === 'filling' ? 'Filling up' : 'Open';
    return { filled, pct, status, label };
}

export function spotsLeft(event: TournamentEvent) {
    return Math.max(0, event.capacity - event.roster.length);
}

export function shortName(name: string) {
    return name.trim().split(/\s+/)[0] ?? name;
}

export function nameOf(event: TournamentEvent, entrantId: string) {
    return event.roster.find((p) => p.id === entrantId)?.name ?? 'Player';
}

/* ── Cohorts — Beginner/Intermediate/Advance each run their own separate
   tournament (own draw, own rounds, own standings), started and finished
   independently by the organizer. ─────────────────────────────────── */

const COHORT_ORDER: EventSkill[] = ['Beginner', 'Intermediate', 'Advance'];

/** Cohorts that actually matter for this event — configured levels, plus any level a player registered with. */
export function cohortsOf(event: TournamentEvent): EventSkill[] {
    const set = new Set<EventSkill>(event.skillLevels);
    event.roster.forEach((p) => set.add(p.skill));
    return COHORT_ORDER.filter((c) => set.has(c));
}

export function rosterIn(event: TournamentEvent, cohort: EventSkill) {
    return event.roster.filter((p) => p.skill === cohort);
}

export function roundsIn(event: TournamentEvent, cohort: EventSkill) {
    return event.rounds.filter((r) => SKILL_TO_CLIENT[r.cohort ?? ''] === cohort);
}

export type CohortStatus = 'not_started' | 'live' | 'completed';

export function cohortStatus(event: TournamentEvent, cohort: EventSkill): CohortStatus {
    if (event.completedCohorts.includes(cohort)) return 'completed';
    return roundsIn(event, cohort).length > 0 ? 'live' : 'not_started';
}

/** The round currently being played for a cohort, if any — null once that cohort is finished or hasn't started. */
export function currentRound(event: TournamentEvent, cohort: EventSkill): ApiEventRound | null {
    return roundsIn(event, cohort).find((r) => r.status === 'ACTIVE') ?? null;
}

export interface StandingsRow {
    playerId: string;
    name: string;
    played: number;
    won: number;
    points: number;
    bestRound: number;
    rank: number;
}

/**
 * Same tiebreaker order as the organizer scoring engine (sports-api's
 * computeStandings): total points, then head-to-head (only meaningful
 * between two players who've actually faced each other), then best
 * single-round score, then enrollment order. Ranks are shared for
 * identical point totals — kept in sync so the player and organizer
 * views never disagree on placement.
 */
export function standings(event: TournamentEvent, cohort: EventSkill): StandingsRow[] {
    const base = new Map<
        string,
        StandingsRow & { createdAt: string }
    >();

    for (const player of rosterIn(event, cohort)) {
        base.set(player.id, {
            playerId: player.id,
            name: player.name,
            createdAt: player.createdAt,
            played: 0,
            won: 0,
            points: 0,
            bestRound: 0,
            rank: 0,
        });
    }

    const headToHead = new Map<string, number>();
    const h2hKey = (a: string, b: string) => `${a}>${b}`;

    for (const round of roundsIn(event, cohort)) {
        for (const match of round.matches) {
            if (match.scoreA === null || match.scoreB === null) continue;

            const teamA = [match.teamAEntrant1Id, match.teamAEntrant2Id];
            const teamB = [match.teamBEntrant1Id, match.teamBEntrant2Id];

            for (const id of teamA) {
                const row = base.get(id);
                if (!row) continue;
                row.points += match.scoreA;
                row.played += 1;
                row.bestRound = Math.max(row.bestRound, match.scoreA);
                if (match.scoreA > match.scoreB) row.won += 1;
            }
            for (const id of teamB) {
                const row = base.get(id);
                if (!row) continue;
                row.points += match.scoreB;
                row.played += 1;
                row.bestRound = Math.max(row.bestRound, match.scoreB);
                if (match.scoreB > match.scoreA) row.won += 1;
            }

            for (const a of teamA) {
                for (const b of teamB) {
                    headToHead.set(h2hKey(a, b), (headToHead.get(h2hKey(a, b)) ?? 0) + match.scoreA);
                    headToHead.set(h2hKey(b, a), (headToHead.get(h2hKey(b, a)) ?? 0) + match.scoreB);
                }
            }
        }
    }

    const rows = [...base.values()];

    rows.sort((x, y) => {
        if (x.points !== y.points) return y.points - x.points;

        const xVsY = headToHead.get(h2hKey(x.playerId, y.playerId));
        const yVsX = headToHead.get(h2hKey(y.playerId, x.playerId));
        if (xVsY !== undefined && yVsX !== undefined && xVsY !== yVsX) {
            return yVsX - xVsY;
        }

        if (x.bestRound !== y.bestRound) return y.bestRound - x.bestRound;

        return new Date(x.createdAt).getTime() - new Date(y.createdAt).getTime();
    });

    let rank = 0;
    let prevPoints: number | null = null;
    rows.forEach((row, i) => {
        if (row.points !== prevPoints) {
            rank = i + 1;
            prevPoints = row.points;
        }
        row.rank = rank;
    });

    return rows;
}

const localKey = (slug: string) => `bookease-event-reg-${slug}`;

export function getRegistration(slug: string): EventRegistration | null {
    const raw = localStorage.getItem(localKey(slug));
    if (!raw) return null;
    try {
        return JSON.parse(raw) as EventRegistration;
    } catch {
        return null;
    }
}

function saveLocalRegistration(reg: EventRegistration) {
    localStorage.setItem(localKey(reg.eventSlug), JSON.stringify(reg));
    window.dispatchEvent(new Event('bookease-registrations'));
}

export function clearRegistration(slug: string) {
    localStorage.removeItem(localKey(slug));
    window.dispatchEvent(new Event('bookease-registrations'));
}

/** Persists a completed registration (paid, waitlisted, or free entry) as "my pass" on this device. */
export function finalizeRegistration(reg: EventRegistration) {
    saveLocalRegistration(reg);
}

/**
 * Submits the registration form. Free entries and waitlist spots register
 * immediately (`registration` comes back set, `razorpay` is null). A paid
 * entry with a spot open does NOT create a registration yet — only a
 * Razorpay order (`registration` is null, `razorpay` is set) — the caller
 * must complete checkout and call `confirmPayment` to actually create it.
 * This means a cancelled or abandoned checkout never leaves behind an
 * "unpaid" registration occupying a spot.
 */
export async function submitRegistration(
    slug: string,
    data: { name: string; phone: string; skill: EventSkill },
): Promise<{
    registration: EventRegistration | null;
    razorpay: ApiEventRazorpayOrder | null;
}> {
    const res = await apiRegisterForEvent(slug, {
        name: data.name,
        phone: data.phone,
        skill: SKILL_TO_API[data.skill],
    });

    if (!res.data.entrant) {
        return { registration: null, razorpay: res.data.razorpay };
    }

    const registration: EventRegistration = {
        eventSlug: slug,
        entrantId: res.data.entrant.id,
        name: res.data.entrant.name,
        phone: res.data.entrant.phone ?? data.phone,
        skill: data.skill,
        ticketCode: res.data.ticketCode!,
        waitlisted: res.data.waitlisted,
        createdAt: res.data.entrant.createdAt,
    };

    return { registration, razorpay: null };
}

/** Verifies a completed Razorpay payment and only then creates the registration. */
export async function confirmPayment(
    slug: string,
    data: { name: string; phone: string; skill: EventSkill },
    payment: {
        razorpayOrderId: string;
        razorpayPaymentId: string;
        razorpaySignature: string;
    },
): Promise<EventRegistration> {
    const res = await apiConfirmEventPayment(slug, {
        name: data.name,
        phone: data.phone,
        skill: SKILL_TO_API[data.skill],
        ...payment,
    });

    return {
        eventSlug: slug,
        entrantId: res.data.entrant.id,
        name: res.data.entrant.name,
        phone: res.data.entrant.phone ?? data.phone,
        skill: data.skill,
        ticketCode: res.data.ticketCode,
        waitlisted: res.data.waitlisted,
        createdAt: res.data.entrant.createdAt,
    };
}
