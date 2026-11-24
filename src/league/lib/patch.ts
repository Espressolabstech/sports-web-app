/** Instant local updates (the scorer's own save shows before the server answers). Set by useLeagueSync. */
import type { LeagueView } from '@league/lib/server-types';

let patcher: ((fn: (v: LeagueView) => LeagueView) => void) | null = null;
export const setLeaguePatcher = (p: typeof patcher) => {
    patcher = p;
};
export const patchLeague = (fn: (v: LeagueView) => LeagueView) => patcher?.(fn);
