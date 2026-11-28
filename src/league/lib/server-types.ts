/** The league view returned by sports-api (GET …/league, …/league/team, /public/…/league). */
export type ServerLineup = {
    spots: Record<string, string | null>;
    confirmedAt?: string | null;
    autoFillSource: string | null;
    changedAfterLock: boolean;
    replacedSpots: string[];
    complete?: boolean;
    warnings?: string[];
};
export type ServerPlayer = { id: string; no: string; name: string; gender: 'M' | 'F'; padel?: 'Beginner' | 'Intermediate' | 'Advanced'; pickleball?: 'Beginner' | 'Intermediate' | 'Advanced'; photoUrl?: string | null; phone?: string | null };
export type ServerTable = { slot: number; played: number; tiesWon: number; points: number; bonus?: number; won: number; matches: number; winRatio: number; netRatio: number; tied: boolean };
export type StageInfo = { status: 'waiting' | 'needs-draw' | 'ready'; waitingFor?: string; draws?: { table: 'group1' | 'group2' | 'combined'; slots: number[] }[]; pairs?: [number, number][]; repair?: [number, number][]; source?: string };
export type LeagueView = {
    setUp?: boolean;
    event: { slug: string; title: string };
    now: string;
    viewer: 'host' | 'team' | 'public';
    mySlot: number | null;
    teams: { id: string; auctionTeamId: string; slot: number; code: string; group: number; name: string; logoUrl: string | null; user?: { name: string; phone: string } | null }[];
    auctionTeams?: { id: string; name: string; logoUrl: string | null; players?: number }[];
    squads: Record<string, ServerPlayer[]>;
    rounds: { key: string; label: string; lockAt: string | null }[];
    ties: {
        number: number;
        round: string;
        roundLabel: string;
        day: number;
        stage: 'league' | 'semi' | 'final';
        pairingLabel: string;
        slotA: number | null;
        slotB: number | null;
        part1: string;
        pairingSource: string;
        lockedAt: string | null;
        /** Team view only: an admin lock override for the signed-in team. */
        myLock?: 'locked' | 'unlocked' | null;
        status: 'scheduled' | 'live' | 'done';
        complete: boolean;
        score: { a: number; b: number; winsA: number; winsB: number; winner: 'a' | 'b' | null };
        matches: { discipline: string; scoreA: number; scoreB: number; tbA: number | null; tbB: number | null; outcome: string; winner: 'a' | 'b' | null; done: boolean; playersA: string[]; playersB: string[] }[];
        lineupA: ServerLineup | null;
        lineupB: ServerLineup | null;
    }[];
    tables: { group1: ServerTable[]; group2: ServerTable[]; combined: ServerTable[] };
    stages?: { cross: StageInfo; semis: StageInfo; final: { sides: { a: number | null; b: number | null }; source: string; repair?: [number | null, number | null] } };
    drawOrder?: Partial<Record<'group1' | 'group2' | 'combined', number[]>>;
    logsCount?: number;
    asHost?: boolean;
    me?: { slot: number; name: string; user: string | null };
};
