/** Squads from the server (the auction's sold players): same API as the reference's league-squads.ts. */
import type { LeaguePlayer } from '@league/lib/lineup-rules';
import { getLeagueView } from '@league/lib/league-store';

export function squadFor(code: string): LeaguePlayer[] {
    const view = getLeagueView();
    const slot = 'ABCDEFGH'.indexOf(code) + 1;
    return (view?.squads[String(slot)] ?? []).map((p) => ({
        id: p.id,
        team: code,
        no: p.no,
        name: p.name,
        gender: p.gender,
        // Levels are only sent where the viewer may see them (organisers, own team).
        padel: p.padel as LeaguePlayer['padel'],
        pickleball: p.pickleball as LeaguePlayer['pickleball'],
    }));
}
export const LEAGUE_PLAYERS: LeaguePlayer[] = [];
