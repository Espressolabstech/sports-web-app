import type { TournamentEvent } from '../../../lib/public-events';
import type { OrganizerEvent } from './types';

/** The host screens read the organiser's event shape; this fills it from the public event. Read-only. */
export function toHostEvent(event: TournamentEvent): OrganizerEvent {
    return {
        id: event.id,
        slug: event.slug,
        title: event.title,
        format: event.format,
        courts: event.courts,
        goldenPoint: event.goldenPoint,
        scheduleMode: event.scheduleMode ?? 'STANDARD',
        phase: event.phase,
        entrants: event.roster.map((p) => ({ id: p.id, name: p.name, checkedIn: p.checkedIn, waitlisted: p.waitlisted })),
        matches: event.matches.map((m) => ({ ...m, state: m.state as OrganizerEvent['matches'][number]['state'] })),
        americanoRounds: [],
    };
}
