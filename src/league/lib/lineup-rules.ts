/**
 * League line-up rules — pure functions, no React, no storage.
 * Port these as-is to the real backend (validate on the server too).
 */
import { DISCIPLINES } from '@league/lib/tournament';
export type Level = 'Beginner' | 'Intermediate' | 'Advanced';
export type Sport = 'Pickleball' | 'Padel';
export type LeaguePlayer = { id: string; team: string; no: string; name: string; gender: 'M' | 'F'; padel: Level; pickleball: Level };

export type SpotNeed = 'man' | 'woman' | 'inter';
export type Spot = { id: string; code: string; discipline: string; sport: Sport; match: string; points: number; need: SpotNeed; label: string };

const pointsOf = (discipline: string) => DISCIPLINES.find(d => d.key === discipline)?.points ?? 0;
const m = (code: string, discipline: string, sport: Sport, match: string, needs: SpotNeed[]): Spot[] =>
  needs.map((need, i) => ({ id: `${discipline}.${i}`, code, discipline, sport, match, points: pointsOf(discipline), need, label: need === 'woman' ? 'Woman' : need === 'man' ? (needs.length > 1 && needs.includes('woman') ? 'Man' : `Man ${needs.length > 1 ? i + 1 : ''}`.trim()) : `Player ${i + 1}` }));

/** The 13 spots across the 7 matches of a tie (discipline keys match the scorer). */
export const SPOTS: Spot[] = [
  ...m('PB1', 'pb_singles', 'Pickleball', "Men's Singles", ['man']),
  ...m('PB2', 'pb_mens', 'Pickleball', "Open Men's", ['man', 'man']),
  ...m('PB3', 'pb_mixed', 'Pickleball', 'Open Mixed', ['man', 'woman']),
  ...m('PB4', 'pb_inter', 'Pickleball', 'Intermediate', ['inter', 'inter']),
  ...m('PD1', 'padel_mens', 'Padel', "Open Men's", ['man', 'man']),
  ...m('PD2', 'padel_mixed', 'Padel', 'Open Mixed', ['man', 'woman']),
  ...m('PD3', 'padel_inter', 'Padel', 'Intermediate', ['inter', 'inter']),
];
export const SPOT_COUNT = SPOTS.length; // 13
export const MAX_DUAL = 2;

/** spot id → player id (or null when empty). */
export type Lineup = Record<string, string | null>;
export const emptyLineup = (): Lineup => Object.fromEntries(SPOTS.map(s => [s.id, null]));
const spot = (id: string) => SPOTS.find(s => s.id === id);

/** Slot eligibility: men-only spots, the woman spot of a mixed match, and Beginner/Intermediate in that sport. */
export function eligible(p: LeaguePlayer, s: Spot): boolean {
  if (s.need === 'man') return p.gender === 'M';
  if (s.need === 'woman') return p.gender === 'F';
  return (s.sport === 'Padel' ? p.padel : p.pickleball) !== 'Advanced';
}

/** Intermediate-match rule, one line, for the match header. */
export const interRule = (_sport: Sport) => 'Beginners and intermediates only';

const LEVEL_RANK: Record<Level, number> = { Beginner: 0, Intermediate: 1, Advanced: 2 };
const levelIn = (p: LeaguePlayer, sport: Sport) => sport === 'Padel' ? p.padel : p.pickleball;

/**
 * Injury replacement after the lock (rulebook section 7). The candidate must:
 * not already play 2 matches in this tie; not already play this sport in this tie;
 * be the right gender (Men's spot: man; Mixed: same gender as the player replaced; Intermediate: any);
 * be a Beginner in that sport, or a lower level in that sport than the player replaced.
 * A replacement may become a third player who plays both sports — that is allowed.
 */
export function replacementEligibility(l: Lineup, spotId: string, outgoing: LeaguePlayer, candidate: LeaguePlayer): { ok: boolean; reasons: string[] } {
  const s = spot(spotId); if (!s) return { ok: false, reasons: ['Unknown spot'] };
  const reasons: string[] = [];
  if (candidate.id === outgoing.id) reasons.push('Player being replaced');
  const mine = SPOTS.filter(x => x.id !== spotId && l[x.id] === candidate.id);
  if (mine.length >= 2) reasons.push('Already plays 2 matches');
  if (mine.some(x => x.sport === s.sport)) reasons.push(`Already plays ${s.sport}`);
  const isMixed = s.discipline.endsWith('_mixed');
  if (s.need === 'man' && !isMixed && candidate.gender !== 'M') reasons.push('Men only');
  if (isMixed && candidate.gender !== outgoing.gender) reasons.push(outgoing.gender === 'F' ? 'Must be a woman' : 'Must be a man');
  const lv = levelIn(candidate, s.sport);
  if (lv !== 'Beginner' && LEVEL_RANK[lv] >= LEVEL_RANK[levelIn(outgoing, s.sport)]) reasons.push(`${s.sport} level must be Beginner or below ${levelIn(outgoing, s.sport)}`);
  return { ok: reasons.length === 0, reasons };
}

/** Sports each player is placed in. */
export function sportsByPlayer(l: Lineup): Map<string, Sport[]> {
  const out = new Map<string, Sport[]>();
  for (const s of SPOTS) { const p = l[s.id]; if (p) out.set(p, [...(out.get(p) ?? []), s.sport]); }
  return out;
}
export const dualPlayers = (l: Lineup) => [...sportsByPlayer(l)].filter(([, ss]) => new Set(ss).size > 1).map(([p]) => p);

/** Can player p go into spot s without breaking a tie-wide rule? (The spot's current occupant is ignored.) */
export function canPlace(l: Lineup, spotId: string, p: LeaguePlayer): boolean {
  const s = spot(spotId); if (!s || !eligible(p, s)) return false;
  const rest: Lineup = { ...l, [spotId]: null };
  const mine = sportsByPlayer(rest).get(p.id) ?? [];
  if (mine.includes(s.sport)) return false; // one match per sport
  if (mine.length > 0 && !dualPlayers(rest).includes(p.id) && dualPlayers(rest).length >= MAX_DUAL) return false;
  return true;
}

/** Players listed by a picker: the current occupant plus everyone who can legally be placed. */
export const options = (l: Lineup, spotId: string, squad: LeaguePlayer[]) => squad.filter(p => p.id === l[spotId] || canPlace(l, spotId, p));

export const filledCount = (l: Lineup) => SPOTS.filter(s => l[s.id]).length;
export const unusedPlayers = (l: Lineup, squad: LeaguePlayer[]) => { const used = new Set(Object.values(l)); return squad.filter(p => !used.has(p.id)); };

export type Warning = { code: 'empty' | 'ineligible' | 'same-sport' | 'dual' | 'unused' | 'not-in-squad'; message: string };

/** Every rule broken by a line-up (organiser edits may save anyway; team saves never reach this state). */
export function validate(l: Lineup, squad: LeaguePlayer[]): Warning[] {
  const w: Warning[] = []; const byId = new Map(squad.map(p => [p.id, p]));
  const empty = SPOTS.filter(s => !l[s.id]);
  if (empty.length) w.push({ code: 'empty', message: `${empty.length} of ${SPOT_COUNT} spots empty` });
  for (const s of SPOTS) {
    const id = l[s.id]; if (!id) continue; const p = byId.get(id);
    if (!p) { w.push({ code: 'not-in-squad', message: `${s.code}: player not in this squad` }); continue; }
    if (!eligible(p, s)) w.push({ code: 'ineligible', message: `${s.code} ${s.match}: ${p.name} is not eligible (${s.need === 'inter' ? `${s.sport} level is Advanced` : s.need === 'woman' ? 'woman spot' : 'men only'})` });
  }
  for (const [pid, ss] of sportsByPlayer(l)) for (const sp of ['Pickleball', 'Padel'] as Sport[])
    if (ss.filter(x => x === sp).length > 1) w.push({ code: 'same-sport', message: `${byId.get(pid)?.name ?? pid} plays more than one ${sp} match` });
  const dual = dualPlayers(l); if (dual.length > MAX_DUAL) w.push({ code: 'dual', message: `${dual.length} players play both sports (max ${MAX_DUAL})` });
  const unused = unusedPlayers(l, squad); if (unused.length) w.push({ code: 'unused', message: `Not used yet: ${unused.map(p => p.name).join(', ')}` });
  return w;
}
export const isComplete = (l: Lineup, squad: LeaguePlayer[]) => validate(l, squad).length === 0;

/** Only the picks that are individually legal, kept in spot order (used to salvage a half-finished line-up). */
export function validPicks(l: Lineup, squad: LeaguePlayer[]): Lineup {
  const out = emptyLineup(); const byId = new Map(squad.map(p => [p.id, p]));
  for (const s of SPOTS) { const p = l[s.id] ? byId.get(l[s.id]!) : undefined; if (p && canPlace(out, s.id, p)) out[s.id] = p.id; }
  return out;
}

/**
 * Backtracking solver: fills every empty spot, keeps given picks, uses all players.
 * Deterministic for a given squad order. Returns null when no legal completion exists.
 */
export function solve(squad: LeaguePlayer[], start: Lineup = emptyLineup()): Lineup | null {
  const l = { ...emptyLineup(), ...start };
  const order = SPOTS.filter(s => !l[s.id]).sort((a, b) => rank(a) - rank(b));
  const go = (i: number): boolean => {
    const unused = unusedPlayers(l, squad);
    if (unused.length > order.length - i) return false;
    if (i === order.length) return unused.length === 0;
    const s = order[i]!;
    const cands = squad.filter(p => canPlace(l, s.id, p)).sort((a, b) => Number(unused.includes(b)) - Number(unused.includes(a)));
    for (const p of cands) { l[s.id] = p.id; if (go(i + 1)) return true; }
    l[s.id] = null; return false;
  };
  return go(0) ? l : null;
}
const rank = (s: Spot) => s.need === 'woman' ? 0 : s.need === 'inter' ? 1 : 2;

/** Is there still a way to finish this line-up legally? */
export const canStillComplete = (l: Lineup, squad: LeaguePlayer[]) => solve(squad, validPicks(l, squad)) !== null;

export type AutoFillSource = 'kept-and-filled' | 'copied-previous' | 'generated';

/**
 * Missed-lock auto-fill.
 * - Half-finished: keep valid picks and fill the rest; if impossible, copy the previous tie.
 * - Nothing picked: copy the previous tie.
 * - No previous tie (Round 1): generate a legal line-up.
 */
export function autoFill(squad: LeaguePlayer[], current: Lineup | null, previous: Lineup | null): { lineup: Lineup; source: AutoFillSource } {
  const hasPicks = !!current && filledCount(current) > 0;
  if (hasPicks) { const kept = solve(squad, validPicks(current!, squad)); if (kept) return { lineup: kept, source: 'kept-and-filled' }; }
  if (previous && isComplete(previous, squad)) return { lineup: { ...previous }, source: 'copied-previous' };
  return { lineup: solve(squad) ?? emptyLineup(), source: 'generated' };
}

/** Lock time = start − lead minutes (tie override, else event default). */
export const lockTime = (startIso: string, leadMinutes: number) => new Date(new Date(startIso).getTime() - leadMinutes * 60_000);

/** Human-readable diff for the change log. */
export function diff(before: Lineup, after: Lineup, squad: LeaguePlayer[]): string[] {
  const n = (id: string | null) => id ? squad.find(p => p.id === id)?.name ?? id : 'empty';
  return SPOTS.filter(s => (before[s.id] ?? null) !== (after[s.id] ?? null)).map(s => `${s.code} ${s.match} (${s.label}): ${n(before[s.id] ?? null)} → ${n(after[s.id] ?? null)}`);
}
