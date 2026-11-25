/** The reference's server functions, as calls to sports-api. */
import { getLeagueView } from '@league/lib/league-store';
import { requestLeague } from '@league/lib/request';
import { patchLeague } from '@league/lib/patch';
import { leagueStatus } from '@league/lib/league-status';
import { applyScorePatch } from '@league/lib/live-merge';
import type { Match, Tie } from '@league/lib/tournament';

export type TestingPreset = 'reset' | 'r3' | 'r5' | 'sf' | 'done';

export async function saveMatchScore({ data }: { data: { tieId: number; discipline: string; a: number; b: number; done: boolean; outcome: 'score' | 'wo' | 'ret'; winner: 'a' | 'b' | null; tbA: number | null; tbB: number | null } }) {
    const before = getLeagueView();
    // Show it on this screen at once; the server pushes the same change to every other screen.
    patchLeague((v) => applyScorePatch(v, data.tieId, { discipline: data.discipline, scoreA: data.a, scoreB: data.b, tbA: data.tbA, tbB: data.tbB, outcome: data.outcome, winner: data.winner, done: data.done }));
    let out: { filled?: string[] };
    try {
      out = (await requestLeague('PUT', `/host/events/:slug/league/ties/${data.tieId}/score`, {
        discipline: data.discipline,
        outcome: data.outcome,
        scoreA: data.a,
        scoreB: data.b,
        tbA: data.tbA,
        tbB: data.tbB,
        winner: data.winner,
        done: data.done,
      })) as { filled?: string[] };
    } catch (e) {
        // Not saved: drop the optimistic change.
        void leagueStatus.refetch?.();
        throw e;
    }
    const match: Match = { tie_id: data.tieId, discipline: data.discipline as Match['discipline'], score_a: data.a, score_b: data.b, done: data.done, winner: data.winner, outcome: data.outcome, tb_a: data.tbA, tb_b: data.tbB };
    const tie = before?.ties.find((t) => t.number === data.tieId);
    return { match, tie: { id: data.tieId, status: tie?.status ?? 'live' } as Pick<Tie, 'id' | 'status'>, crossCreated: !!out?.filled?.includes('cross'), ok: true as const };
}

export async function seedScoringForTesting({ data }: { data: { preset: TestingPreset } }) {
    await requestLeague('POST', '/host/events/:slug/league/testing', { preset: data.preset });
    return { ok: true };
}
