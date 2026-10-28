import type { TeamTournament } from './teamTournament';

/** A team tournament as the public API returns it (no phone numbers). */
export interface TeamEvent {
    slug: string;
    title: string;
    sport: 'Padel' | 'Pickleball';
    format: string;
    eventType: 'team';
    venueName: string;
    venueArea: string;
    description: string;
    posterUrl: string;
    dateISO: string;
    time: string;
    endTime: string;
    priceInr: number;
    capacity: number;
    courts: number;
    registrationClosesHours: number;
    phase: 'draft' | 'published' | 'live' | 'completed';
    createdAt: string;
    teamTournament: TeamTournament;
}

/** When online registration stops: the start time minus the closing window (local time, like the rest of the app). */
export function registrationCloses(event: Pick<TeamEvent, 'dateISO' | 'time' | 'registrationClosesHours'>) {
    const [h, m] = event.time.split(':').map(Number);
    const [y, mo, d] = event.dateISO.split('-').map(Number);
    return new Date(new Date(y, mo - 1, d, h, m).getTime() - event.registrationClosesHours * 3_600_000);
}
