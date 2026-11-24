export type Stage = 'league' | 'semi' | 'final';
export type Round = 'group' | 'cross' | 'ko';
export type DisciplineKey = 'padel_inter' | 'padel_mixed' | 'padel_mens' | 'pb_singles' | 'pb_inter' | 'pb_mixed' | 'pb_mens';
export type Discipline = { key: DisciplineKey; sport: 'Padel' | 'Pickleball'; name: string; points: number };

export const DISCIPLINES: Discipline[] = [
  { key: 'padel_inter', sport: 'Padel', name: 'Intermediate Doubles (GN)', points: 10 },
  { key: 'padel_mixed', sport: 'Padel', name: 'Open Mixed Doubles', points: 15 },
  { key: 'padel_mens', sport: 'Padel', name: "Open Men's Doubles", points: 15 },
  { key: 'pb_singles', sport: 'Pickleball', name: "Open Men's Singles", points: 10 },
  { key: 'pb_inter', sport: 'Pickleball', name: 'Intermediate Doubles (GN)', points: 10 },
  { key: 'pb_mixed', sport: 'Pickleball', name: 'Open Mixed Doubles', points: 15 },
  { key: 'pb_mens', sport: 'Pickleball', name: "Open Men's Doubles", points: 15 },
];
export const DISCIPLINE_KEYS = DISCIPLINES.map(d => d.key) as [DisciplineKey, ...DisciplineKey[]];
export const MATCH_POINTS = DISCIPLINES.reduce((s, d) => s + d.points, 0);
/** Bonus for the team that wins the tie (4 or more of 7 matches). */
export const TIE_BONUS = 10;
export const TIE_POINTS = MATCH_POINTS + TIE_BONUS;
export const WINS_NEEDED = 4;

/** Fixed rules (handoff §12): padel tie-break at 5–5, bonus included. Kept as a type so the reference screens compile unchanged. */
export type Settings = { padelTb: '5-5'; includeBonus: true; playAll: boolean; manualOrder: number[] };
export const DEFAULT_SETTINGS: Settings = { padelTb: '5-5', includeBonus: true, playAll: true, manualOrder: [] };
export const fmtPts = (n: number) => String(n);

/**
 * Client copy of the server engine (sports-api src/utils/league/tournament.ts). Ported from the Lovable reference (src/lib/tournament.ts). Changes, per the league handoff §6/§12:
 * fixed rules (padel tie-break at 5–5, the tie-win bonus always counts), net ratio as shares of games/points played,
 * and an organiser draw order for group tables too.
 */

/** Games (Padel: league first to 5, knockouts first to 6) or points (Pickleball: 11, golden point). */
export function targetFor(stage: Stage, key: DisciplineKey): number {
  if (key.startsWith('pb_')) return 11;
  return stage === 'league' ? 5 : 6;
}
export const maxScore = (stage: Stage, key: DisciplineKey, _s?: Settings) => targetFor(stage, key) + (key.startsWith('padel_') ? 1 : 0);
export function formatLabel(stage: Stage, key: DisciplineKey, _s?: Settings) {
  if (key.startsWith('pb_')) return 'Game to 11 · golden point at 10–10';
  const g = targetFor(stage, key);
  return `First to ${g} · tie-break at ${g}–${g}`;
}

/** Every valid final score for one side winning, as [winner, loser]. */
export function finalScores(stage: Stage, key: DisciplineKey, _s?: Settings): [number, number][] {
  const g = targetFor(stage, key);
  if (key.startsWith('pb_')) return Array.from({ length: 11 }, (_, l) => [11, l]);
  return [...Array.from({ length: g - 1 }, (_, l) => [g, l] as [number, number]), [g + 1, g - 1], [g + 1, g]];
}
export function isValidFinal(stage: Stage, key: DisciplineKey, a: number, b: number, _s?: Settings) {
  return finalScores(stage, key).some(([w, l]) => (a === w && b === l) || (b === w && a === l));
}

export type Tie = { id: number; stage: Stage; round: Round; slot_a: number | null; slot_b: number | null; label: string; status: string };
export type Outcome = 'score' | 'wo' | 'ret';
export type Match = { tie_id: number; discipline: DisciplineKey; score_a: number; score_b: number; done: boolean; winner?: 'a' | 'b' | null; outcome?: Outcome; tb_a?: number | null; tb_b?: number | null };

export const matchWinner = (m: Match): 'a' | 'b' | null => !m.done ? null : m.winner ?? (m.score_a > m.score_b ? 'a' : 'b');
const pts = (k: DisciplineKey) => DISCIPLINES.find(d => d.key === k)?.points ?? 0;

/** Tie summary: matches won, points incl. the tie-win bonus, and the tie winner (first to 4 matches). */
export function tieScore(matches: Match[]) {
  let a = 0, b = 0, winsA = 0, winsB = 0;
  for (const m of matches) {
    const w = matchWinner(m); if (!w) continue;
    if (w === 'a') { a += pts(m.discipline); winsA++; } else { b += pts(m.discipline); winsB++; }
  }
  const winner = winsA >= WINS_NEEDED ? 'a' as const : winsB >= WINS_NEEDED ? 'b' as const : null;
  if (winner === 'a') a += TIE_BONUS; else if (winner === 'b') b += TIE_BONUS;
  return { a, b, winsA, winsB, winner };
}
export const tieWinner = (_tie: Tie, matches: Match[]) => tieScore(matches).winner;

/** League requires all seven results; knockout remaining matches are optional after four wins. */
export const tieComplete = (tie: Tie, matches: Match[]) =>
  tie.round === 'ko' && tieScore(matches).winner != null || matches.length === 7 && matches.every(m => m.done);

/** Share of games/points won out of all played (0 when none played). */
const share = (won: number, lost: number) => (won + lost === 0 ? null : won / (won + lost));
/** Net ratio: the average of the padel games share and the pickleball points share (only sports with scores count). */
export function netRatio(r: Pick<Standing, 'padelFor' | 'padelAgainst' | 'pbFor' | 'pbAgainst'>) {
  const parts = [share(r.padelFor, r.padelAgainst), share(r.pbFor, r.pbAgainst)].filter((x): x is number => x !== null);
  return parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 0;
}

export type Standing = { slot: number; played: number; tiesWon: number; points: number; bonus: number; won: number; matches: number; padelFor: number; padelAgainst: number; pbFor: number; pbAgainst: number; npr: number; tied: boolean; /** Same value for teams still exactly level after every tie-breaker (before the organiser draw). */ tieKey: string | null };

function tally(ties: Tie[], matches: Match[], slots: number[]) {
  const rows = new Map<number, Standing>(slots.map(s => [s, { slot: s, played: 0, tiesWon: 0, points: 0, bonus: 0, won: 0, matches: 0, padelFor: 0, padelAgainst: 0, pbFor: 0, pbAgainst: 0, npr: 0, tied: false, tieKey: null }]));
  for (const t of ties) {
    if (t.slot_a == null || t.slot_b == null) continue;
    const A = rows.get(t.slot_a), B = rows.get(t.slot_b); if (!A || !B) continue;
    const ms = matches.filter(m => m.tie_id === t.id);
    for (const m of ms) {
      const w = matchWinner(m); if (!w) continue;
      A.matches++; B.matches++;
      if (w === 'a') A.won++; else B.won++;
      if ((m.outcome ?? 'score') !== 'score') continue;
      if (m.discipline.startsWith('padel_')) { A.padelFor += m.score_a; A.padelAgainst += m.score_b; B.padelFor += m.score_b; B.padelAgainst += m.score_a; }
      else { A.pbFor += m.score_a; A.pbAgainst += m.score_b; B.pbFor += m.score_b; B.pbAgainst += m.score_a; }
    }
    const s = tieScore(ms); A.points += s.a; B.points += s.b;
    if (s.winner === 'a') A.bonus += TIE_BONUS; else if (s.winner === 'b') B.bonus += TIE_BONUS;
    if (tieComplete(t, ms)) { A.played++; B.played++; if (s.winner === 'a') A.tiesWon++; else if (s.winner === 'b') B.tiesWon++; }
  }
  for (const r of rows.values()) r.npr = netRatio(r);
  return rows;
}

/**
 * Ranking: total match points (bonus optional) → win ratio → head-to-head → net ratio → organiser draw (manualOrder).
 * mode 'group': head-to-head always uses results among the tied teams only.
 * mode 'combined': head-to-head only when every tied team has played every other.
 */
export const winRatio = (r: Standing) => r.matches ? r.won / r.matches : 0;
export function rank(ties: Tie[], matches: Match[], slots: number[], mode: 'group' | 'combined', manualOrder: number[] = []): Standing[] {
  const rows = [...tally(ties, matches, slots).values()];
  const wr = (r: Standing) => Math.round(winRatio(r) * 1e6);
  const list = rows.sort((x, y) => y.points - x.points || wr(y) - wr(x) || x.slot - y.slot);
  const out: Standing[] = [];
  for (let i = 0; i < list.length;) {
    let j = i + 1; while (j < list.length && list[j]!.points === list[i]!.points && wr(list[j]!) === wr(list[i]!)) j++;
    const cluster = list.slice(i, j);
    if (cluster.length > 1) {
      const set = new Set(cluster.map(c => c.slot));
      const between = ties.filter(t => t.slot_a != null && t.slot_b != null && set.has(t.slot_a) && set.has(t.slot_b));
      const played = (a: number, b: number) => between.some(t => ((t.slot_a === a && t.slot_b === b) || (t.slot_a === b && t.slot_b === a)) && matches.filter(m => m.tie_id === t.id).some(m => m.done));
      const useH2H = mode === 'group' || cluster.every(a => cluster.every(b => a.slot === b.slot || played(a.slot, b.slot)));
      const h2h = useH2H ? tally(between, matches, [...set]) : null;
      const hp = (r: Standing) => h2h!.get(r.slot)!.points;
      const key = (r: Standing) => [h2h ? hp(r) : 0, h2h ? h2h.get(r.slot)!.won : 0, Math.round(r.npr * 1e6)];
      const mo = (s: number) => { const k = manualOrder.indexOf(s); return k < 0 ? 99 : k; };
      cluster.sort((x, y) => { const a = key(x), b = key(y); return (b[0]! - a[0]!) || (b[1]! - a[1]!) || (b[2]! - a[2]!) || (mo(x.slot) - mo(y.slot)) || x.slot - y.slot; });
      for (const r of cluster) {
        r.tied = r.matches > 0 && cluster.some(o => o !== r && key(o).every((v, k) => v === key(r)[k]));
        r.tieKey = r.tied ? `${i}:${key(r).join(',')}` : null;
      }
    }
    out.push(...cluster); i = j;
  }
  return out;
}

export const GROUP_A = [1, 2, 3, 4], GROUP_B = [5, 6, 7, 8];
export const ALL_SLOTS = [...GROUP_A, ...GROUP_B];
export const slotLabel = (s: number) => s <= 4 ? `G1·${s}` : `G2·${s - 4}`;
/** Team code A–H equals the draw slot 1–8. */
export const teamCode = (slot: number) => 'ABCDEFGH'[slot - 1] ?? '?';
export const groupOf = (slot: number) => slot <= 4 ? 1 : 2;

/** Round number for a tie: 1–3 group, 4–5 crossover, 'SF' / 'F'. */
const R4 = [14, 15, 18, 19], R5 = [13, 16, 17, 20];
export type RoundKey = 1 | 2 | 3 | 4 | 5 | 'SF' | 'F';
export function roundOf(id: number): RoundKey {
  if (id <= 4) return 1; if (id <= 8) return 2; if (id <= 12) return 3;
  if (R4.includes(id)) return 4; if (R5.includes(id)) return 5; return id === 23 ? 'F' : 'SF';
}
export const ROUND_ORDER: RoundKey[] = [1, 2, 3, 4, 5, 'SF', 'F'];
export const roundName = (r: RoundKey) => r === 'SF' ? 'Semi-finals' : r === 'F' ? 'Final' : `Round ${r}`;
export const dayOf = (id: number) => typeof roundOf(id) === 'number' && (roundOf(id) as number) <= 3 ? 1 : 2;
/** Crossover pairing description for ties 13–20. */
const CROSS: Record<number, string> = { 13: 'G1 1st v G2 3rd', 14: 'G1 1st v G2 4th', 15: 'G1 2nd v G2 3rd', 16: 'G1 2nd v G2 4th', 17: 'G2 1st v G1 3rd', 18: 'G2 1st v G1 4th', 19: 'G2 2nd v G1 3rd', 20: 'G2 2nd v G1 4th', 21: 'Table 1st v 4th', 22: 'Table 2nd v 3rd', 23: 'Semi-final winners' };
export const pairingLabel = (id: number) => CROSS[id] ?? '';
/** Default Part 1 sport per tie. */
const PADEL_FIRST = [3, 4, 7, 8, 11, 12, 17, 18, 19, 20, 22];
export const defaultPart1 = (id: number): 'Pickleball' | 'Padel' => PADEL_FIRST.includes(id) ? 'Padel' : 'Pickleball';
export const leagueTies = (ties: Tie[]) => ties.filter(t => t.round !== 'ko');

/** Combined 8-team league table across group and crossover ties. */
export const standings = (ties: Tie[], matches: Match[], manualOrder: number[] = []) => rank(leagueTies(ties), matches, ALL_SLOTS, 'combined', manualOrder);
/** Group tables: Rounds 1–3 only. `slots` are the group's slots (groups come from the draw). */
export const groupTable = (ties: Tie[], matches: Match[], slots: number[], manualOrder: number[] = []) =>
  rank(ties.filter(t => t.round === 'group'), matches, slots, 'group', manualOrder);

/** Crossover ties 13–20 in order: A1vB3, A1vB4, A2vB3, A2vB4, B1vA3, B1vA4, B2vA3, B2vA4. */
export function crossPairs(g1: number[], g2: number[]): number[] {
  const a = g1, b = g2;
  return [a[0]!, b[2]!, a[0]!, b[3]!, a[1]!, b[2]!, a[1]!, b[3]!, b[0]!, a[2]!, b[0]!, a[3]!, b[1]!, a[2]!, b[1]!, a[3]!];
}

/** Semi-final pairings: 1st v 4th, 2nd v 3rd. */
export const semiPairs = (table: Standing[]): [[number, number], [number, number]] | null =>
  table.length < 4 ? null : [[table[0]!.slot, table[3]!.slot], [table[1]!.slot, table[2]!.slot]];

