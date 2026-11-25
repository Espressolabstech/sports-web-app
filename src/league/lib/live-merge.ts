/** Applying pushed league data to the view a screen already has — no request, so the screen updates at once. */
import { tieComplete, tieScore, type DisciplineKey, type Match } from '@league/lib/tournament';
import type { LeagueView } from '@league/lib/server-types';

type ViewTie = LeagueView['ties'][number];
type PushedMatch = Pick<ViewTie['matches'][number], 'discipline' | 'scoreA' | 'scoreB' | 'tbA' | 'tbB' | 'outcome' | 'winner' | 'done'>;

const engineRound = (n: number) => (n <= 12 ? 'group' : n <= 20 ? 'cross' : 'ko') as 'group' | 'cross' | 'ko';

/** Recomputes a tie's score, status and completion after one of its matches changed. */
function rescore(t: ViewTie): ViewTie {
    const ms: Match[] = t.matches.map((m) => ({ tie_id: t.number, discipline: m.discipline as DisciplineKey, score_a: m.scoreA, score_b: m.scoreB, done: m.done, winner: m.winner, outcome: m.outcome as Match['outcome'] }));
    const complete = tieComplete({ id: t.number, stage: t.stage, round: engineRound(t.number), slot_a: t.slotA, slot_b: t.slotB, label: '', status: '' }, ms);
    const started = ms.some((m) => m.done || m.score_a > 0 || m.score_b > 0);
    return { ...t, score: tieScore(ms), complete, status: complete ? 'done' : started ? 'live' : 'scheduled' };
}

/** One match changed (the scorer's save, or the server's instant 'league:score' push). */
export function applyScorePatch(v: LeagueView, tie: number, match: PushedMatch): LeagueView {
    if (!v.ties) return v;
    return {
        ...v,
        ties: v.ties.map((t) => (t.number === tie ? rescore({ ...t, matches: t.matches.map((m) => (m.discipline === match.discipline ? { ...m, ...match } : m)) }) : t)),
    };
}

/** The full public view arrived: take its results, tables, pairings and locks; keep this viewer's private parts. */
export function mergePublic(v: LeagueView, pub: LeagueView): LeagueView {
    if (v.viewer === 'public') return pub;
    if (!v.ties) return v;
    const byNumber = new Map(pub.ties.map((t) => [t.number, t]));
    return {
        ...v,
        rounds: pub.rounds,
        tables: pub.tables,
        ties: v.ties.map((t) => {
            const p = byNumber.get(t.number);
            if (!p) return t;
            return {
                ...t,
                slotA: p.slotA,
                slotB: p.slotB,
                part1: p.part1,
                pairingSource: p.pairingSource,
                lockedAt: p.lockedAt,
                status: p.status,
                complete: p.complete,
                score: p.score,
                matches: t.matches.map((m) => {
                    const pm = p.matches.find((x) => x.discipline === m.discipline);
                    // Players stay from this viewer's copy (organisers see them before the lock).
                    return pm ? { ...m, ...pm, playersA: pm.playersA.length ? pm.playersA : m.playersA, playersB: pm.playersB.length ? pm.playersB : m.playersB } : m;
                }),
                lineupA: t.lineupA ?? p.lineupA,
                lineupB: t.lineupB ?? p.lineupB,
            };
        }),
    };
}
