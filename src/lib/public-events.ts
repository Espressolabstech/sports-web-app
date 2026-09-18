import {
    getEvents,
    getEventDetail,
    registerForEvent as apiRegisterForEvent,
    confirmEventPayment as apiConfirmEventPayment,
} from '../api/adapters/events';

export type EventSkill = 'Beginner' | 'Intermediate' | 'Advance';
export type EventPhase = 'upcoming' | 'live' | 'completed';
export type FillStatusValue = 'open' | 'filling' | 'full';
export type MatchState = 'queued' | 'active' | 'completed';

export interface RosterPlayer {
    id: string;
    name: string;
    skill: EventSkill;
    checkedIn: boolean;
    waitlisted: boolean;
    createdAt: string;
    isMe?: boolean;
}

/**
 * One match. Americano: a slot in the rolling court queue — progression is
 * driven by `queueIndex` + `state`, not a round lifecycle. Mexicano: every
 * match in a round is `active` at once and only advances when the host
 * closes the round.
 */
export interface EventMatch {
    queueIndex: number;
    roundNumber: number;
    state: MatchState;
    court: number | null;
    teamA: [string, string];
    teamB: [string, string];
    scoreA: number | null;
    scoreB: number | null;
    drawTag: string | null;
}

export interface MexicanoRound {
    roundNumber: number;
    resting: string[];
    closed: boolean;
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
    skillLevel: EventSkill;
    goldenPoint: boolean;
    posterUrl: string;
    priceInr: number;
    phase: EventPhase;
    startedAt: Date | null;
    plannedRounds: number | null;
    roster: RosterPlayer[];
    matches: EventMatch[];
    mexicanoRounds: MexicanoRound[];
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

const STATE_TO_CLIENT: Record<string, MatchState> = {
    QUEUED: 'queued',
    ACTIVE: 'active',
    COMPLETED: 'completed',
};

const combine = (dateISO: string, time: string) => new Date(`${dateISO}T${time}:00`);

const mapMatch = (m: ApiEventMatch): EventMatch => ({
    queueIndex: m.queueIndex,
    roundNumber: m.roundNumber,
    state: STATE_TO_CLIENT[m.state] ?? 'queued',
    court: m.court ?? null,
    teamA: [m.teamAEntrant1Id, m.teamAEntrant2Id],
    teamB: [m.teamBEntrant1Id, m.teamBEntrant2Id],
    scoreA: m.scoreA ?? null,
    scoreB: m.scoreB ?? null,
    drawTag: m.drawTag ?? null,
});

const mapMexicanoRound = (r: ApiEventMexicanoRound): MexicanoRound => ({
    roundNumber: r.roundNumber,
    resting: r.resting ?? [],
    closed: Boolean(r.closed),
});

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
        skillLevel: SKILL_TO_CLIENT[e.skillLevel] ?? 'Intermediate',
        goldenPoint: Boolean(e.goldenPoint),
        posterUrl: e.posterUrl ?? '',
        priceInr: e.priceInr,
        phase: PHASE_TO_CLIENT[e.phase] ?? 'upcoming',
        startedAt: e.startedAt ? new Date(e.startedAt) : null,
        plannedRounds: e.plannedRounds ?? null,
        roster: e.entrants.map((p) => ({
            id: p.id,
            name: p.name,
            skill: SKILL_TO_CLIENT[p.skill] ?? 'Intermediate',
            checkedIn: p.checkedIn,
            waitlisted: Boolean(p.waitlisted),
            createdAt: p.createdAt,
        })),
        matches: (e.matches ?? []).map(mapMatch),
        mexicanoRounds: (e.mexicanoRounds ?? []).map(mapMexicanoRound),
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
    } catch (error) {
        // Distinguish a real 404 from a client-side mapping bug in the
        // console — both still resolve to the "not found" screen, but a
        // silent mapping failure shouldn't look identical to a missing
        // event when debugging.
        console.error('fetchEvent failed', slug, error);
        return null;
    }
}

/** Entrants actually in the tournament — the waitlist is excluded from fill, matches and standings. */
export function playingRoster(event: TournamentEvent) {
    return event.roster.filter((p) => !p.waitlisted);
}

export function waitlistOf(event: TournamentEvent) {
    return event.roster.filter((p) => p.waitlisted);
}

export function fillStatus(event: TournamentEvent) {
    const filled = playingRoster(event).length;
    const pct = event.capacity > 0 ? Math.min(100, Math.round((filled / event.capacity) * 100)) : 0;
    const status: FillStatusValue = pct >= 100 ? 'full' : pct >= 60 ? 'filling' : 'open';
    const label = status === 'full' ? 'Full' : status === 'filling' ? 'Filling up' : 'Open';
    return { filled, pct, status, label };
}

export function spotsLeft(event: TournamentEvent) {
    return Math.max(0, event.capacity - playingRoster(event).length);
}

export function shortName(name: string) {
    return name.trim().split(/\s+/)[0] ?? name;
}

export function nameOf(event: TournamentEvent, entrantId: string) {
    return event.roster.find((p) => p.id === entrantId)?.name ?? 'Player';
}

export function isMexicano(event: TournamentEvent) {
    return event.format.toLowerCase().includes('mexicano');
}

export type TournamentStatus = 'not_started' | 'live' | 'completed';

export function tournamentStatus(event: TournamentEvent): TournamentStatus {
    if (event.phase === 'completed') return 'completed';
    return event.matches.length > 0 ? 'live' : 'not_started';
}

/** Mexicano only: the round currently in play (the highest round number that has matches). */
export function currentMexicanoRound(event: TournamentEvent) {
    if (event.matches.length === 0) return null;
    const roundNumber = Math.max(...event.matches.map((m) => m.roundNumber));
    const matches = event.matches
        .filter((m) => m.roundNumber === roundNumber)
        .sort((a, b) => (a.court ?? 0) - (b.court ?? 0));
    const meta = event.mexicanoRounds.find((r) => r.roundNumber === roundNumber) ?? null;
    return { roundNumber, matches, resting: meta?.resting ?? [], closed: meta?.closed ?? false };
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

/** Extra points each player of the winning pair earns when Golden Point is on — kept in sync with sports-api's WINNER_BONUS. */
const WINNER_BONUS = 2;

/**
 * Same tiebreaker order as the organizer scoring engine (sports-api's
 * computeStandings): total points, then head-to-head (only meaningful
 * between two players who've actually faced each other), then best
 * single-match score, then enrollment order. Waitlisted players never
 * played, so they never appear here.
 */
export function standings(event: TournamentEvent): StandingsRow[] {
    const base = new Map<string, StandingsRow & { createdAt: string }>();

    for (const player of playingRoster(event)) {
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

    for (const m of event.matches) {
        if (m.scoreA === null || m.scoreB === null) continue;
        const teamA = m.teamA;
        const teamB = m.teamB;
        const aWins = m.scoreA > m.scoreB;
        const bWins = m.scoreB > m.scoreA;
        const bonusA = event.goldenPoint && aWins ? WINNER_BONUS : 0;
        const bonusB = event.goldenPoint && bWins ? WINNER_BONUS : 0;

        for (const id of teamA) {
            const row = base.get(id);
            if (!row) continue;
            row.points += m.scoreA + bonusA;
            row.played += 1;
            row.bestRound = Math.max(row.bestRound, m.scoreA + bonusA);
            if (aWins) row.won += 1;
        }
        for (const id of teamB) {
            const row = base.get(id);
            if (!row) continue;
            row.points += m.scoreB + bonusB;
            row.played += 1;
            row.bestRound = Math.max(row.bestRound, m.scoreB + bonusB);
            if (bWins) row.won += 1;
        }

        for (const a of teamA) {
            for (const b of teamB) {
                headToHead.set(h2hKey(a, b), (headToHead.get(h2hKey(a, b)) ?? 0) + m.scoreA + bonusA);
                headToHead.set(h2hKey(b, a), (headToHead.get(h2hKey(b, a)) ?? 0) + m.scoreB + bonusB);
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
