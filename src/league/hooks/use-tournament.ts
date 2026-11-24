/** The reference's useTournament(), built from the server's league view. */
import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { Team } from '@league/lib/auction';
import { DEFAULT_SETTINGS, type DisciplineKey, type Match, type Settings, type Tie } from '@league/lib/tournament';
import { getLeagueView, useLeague } from '@league/lib/league-store';
import { leagueStatus } from '@league/lib/league-status';
import type { LeagueView } from '@league/lib/server-types';

export type TournamentData = {
    teams: Team[];
    slots: Record<number, Team>;
    ties: Tie[];
    matches: Match[];
    settings: Settings;
    loaded: boolean;
    error: string | null;
    reload?: () => Promise<void>;
    applyScore?: (match: Match, tie: Pick<Tie, 'id' | 'status'>) => void;
    /** Server-ranked tables (draw orders and the groups from the draw applied). */
    tables: LeagueView['tables'];
    view: LeagueView | null;
};

const engineRound = (n: number): Tie['round'] => (n <= 12 ? 'group' : n <= 20 ? 'cross' : 'ko');
const toTeam = (t: { auctionTeamId?: string; id: string; name: string; logoUrl: string | null }, sort: number): Team => ({ id: t.auctionTeamId ?? t.id, name: t.name, logo_path: t.logoUrl ?? '', purse_paise: 0, sort });

export function buildTournament(view: LeagueView | null): Omit<TournamentData, 'reload' | 'applyScore'> {
    if (!view) return { teams: [], slots: {}, ties: [], matches: [], settings: DEFAULT_SETTINGS, loaded: false, error: null, tables: { group1: [], group2: [], combined: [] }, view };
    const slots: Record<number, Team> = Object.fromEntries((view.teams ?? []).map((t) => [t.slot, toTeam(t, t.slot)]));
    const teams = view.auctionTeams ? view.auctionTeams.map((t, i) => toTeam({ id: t.id, name: t.name, logoUrl: t.logoUrl }, i)) : Object.values(slots);
    const ties: Tie[] = (view.ties ?? []).map((t) => ({
        id: t.number,
        stage: t.stage,
        round: engineRound(t.number),
        slot_a: t.slotA,
        slot_b: t.slotB,
        label: `${t.roundLabel} · Tie ${t.number}`,
        status: t.status,
    }));
    const matches: Match[] = (view.ties ?? []).flatMap((t) =>
        t.matches.map((m) => ({
            tie_id: t.number,
            discipline: m.discipline as DisciplineKey,
            score_a: m.scoreA,
            score_b: m.scoreB,
            done: m.done,
            // The scorer's "won" badges read `winner`; for a played score it follows the score.
            winner: m.winner ?? (m.done ? (m.scoreA > m.scoreB ? 'a' : 'b') : null),
            outcome: m.outcome as Match['outcome'],
            tb_a: m.tbA,
            tb_b: m.tbB,
        })),
    );
    return { teams, slots, ties, matches, settings: DEFAULT_SETTINGS, loaded: true, error: leagueStatus.error, tables: view.tables ?? { group1: [], group2: [], combined: [] }, view };
}

const subscribe = (f: () => void) => leagueStatus.subscribe(f);
export function useTournament(): TournamentData {
    useLeague(); // re-render on every new server view
    const version = useSyncExternalStore(subscribe, () => leagueStatus.version, () => 0);
    const view = getLeagueView();
    const base = useMemo(() => buildTournament(view), [view, version]); // eslint-disable-line react-hooks/exhaustive-deps
    const reload = useCallback(async () => {
        await leagueStatus.refetch?.();
    }, []);
    return { ...base, reload, applyScore: () => undefined };
}
