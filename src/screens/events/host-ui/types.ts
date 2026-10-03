/** Host screens' data shape, filled from the public event. Read-only. */
export type MatchState = 'queued' | 'active' | 'completed';

export interface OrganizerMatch {
    queueIndex: number;
    roundNumber: number;
    state: MatchState;
    court: number | null;
    teamA: [string, string];
    teamB: [string, string];
    scoreA: number | null;
    scoreB: number | null;
    goldenPointWinner: 'A' | 'B' | null;
    drawTag: string | null;
}

export interface OrganizerEntrant {
    id: string;
    name: string;
    checkedIn: boolean;
    waitlisted: boolean;
}

export interface OrganizerEvent {
    id: string;
    slug: string;
    title: string;
    format: string;
    courts: number;
    goldenPoint: boolean;
    scheduleMode: 'STANDARD' | 'NON_STOP' | 'KING_OF_COURT';
    phase: string;
    entrants: OrganizerEntrant[];
    matches: OrganizerMatch[];
    americanoRounds: { roundNumber: number; resting: string[] }[];
}

export const MATCH_POINTS = 24;

export const nameOf = (event: OrganizerEvent, entrantId: string) =>
    event.entrants.find((e) => e.id === entrantId)?.name ?? 'Player';

const COURT_COLOR_VARS = ['--event-court-1', '--event-court-2', '--event-court-3', '--event-court-4'];

export function courtColor(court: number) {
    const varName = COURT_COLOR_VARS[(Math.max(1, court) - 1) % COURT_COLOR_VARS.length];
    return `hsl(var(${varName}))`;
}

export function courtTint(court: number, alpha: number) {
    const varName = COURT_COLOR_VARS[(Math.max(1, court) - 1) % COURT_COLOR_VARS.length];
    return `hsl(var(${varName})/${alpha})`;
}
