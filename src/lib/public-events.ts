import {
    getEvents,
    getEventDetail,
    registerForEvent as apiRegisterForEvent,
    verifyEventPayment as apiVerifyEventPayment,
} from '../api/adapters/events';

export type EventSkill = 'Beginner' | 'Intermediate' | 'Advance';
export type EventPhase = 'upcoming' | 'live' | 'completed';
export type FillStatusValue = 'open' | 'filling' | 'full';

export interface RosterPlayer {
    id: string;
    name: string;
    skill: EventSkill;
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
        roster: e.entrants.map((p) => ({
            id: p.id,
            name: p.name,
            skill: SKILL_TO_CLIENT[p.skill] ?? 'Intermediate',
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

export interface StandingsRow {
    playerId: string;
    name: string;
    played: number;
    won: number;
    points: number;
}

export function standings(event: TournamentEvent): StandingsRow[] {
    const rows = new Map<string, StandingsRow>();

    for (const player of event.roster) {
        rows.set(player.id, { playerId: player.id, name: player.name, played: 0, won: 0, points: 0 });
    }

    for (const round of event.rounds) {
        for (const match of round.matches) {
            if (match.scoreA === null || match.scoreB === null) continue;

            const sides: [string[], number, number][] = [
                [[match.teamAEntrant1Id, match.teamAEntrant2Id], match.scoreA, match.scoreB],
                [[match.teamBEntrant1Id, match.teamBEntrant2Id], match.scoreB, match.scoreA],
            ];

            for (const [team, own, opponent] of sides) {
                for (const playerId of team) {
                    const row = rows.get(playerId);
                    if (!row) continue;
                    row.played += 1;
                    row.points += own;
                    if (own > opponent) row.won += 1;
                }
            }
        }
    }

    return [...rows.values()].sort(
        (a, b) => b.points - a.points || b.won - a.won || a.name.localeCompare(b.name),
    );
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
 * Submits the registration form. If the entry has a fee and a spot is available,
 * the response includes a Razorpay order — the caller must complete checkout and
 * call `confirmEventPayment` before treating the registration as final.
 */
export async function submitRegistration(
    slug: string,
    data: { name: string; phone: string; skill: EventSkill },
): Promise<{ registration: EventRegistration; razorpay: ApiEventRazorpayOrder | null }> {
    const res = await apiRegisterForEvent(slug, {
        name: data.name,
        phone: data.phone,
        skill: SKILL_TO_API[data.skill],
    });

    const registration: EventRegistration = {
        eventSlug: slug,
        entrantId: res.data.entrant.id,
        name: res.data.entrant.name,
        phone: res.data.entrant.phone ?? data.phone,
        skill: data.skill,
        ticketCode: res.data.ticketCode,
        waitlisted: res.data.waitlisted,
        createdAt: res.data.entrant.createdAt,
    };

    return { registration, razorpay: res.data.razorpay };
}

export async function confirmEventPayment(
    slug: string,
    entrantId: string,
    payload: VerifyEventPaymentBody,
): Promise<void> {
    await apiVerifyEventPayment(slug, entrantId, payload);
}
