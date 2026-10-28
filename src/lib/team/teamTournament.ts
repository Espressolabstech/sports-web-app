import robin from "roundrobin";

export interface TeamPlayer { name: string; phone: string; checkedIn: boolean }
export interface TournamentTeam {
  id: string; name: string; players: [TeamPlayer, TeamPlayer]; paid: boolean;
  waitlisted: boolean; cancelled?: boolean; source: "online" | "walk-in"; cohort?: string;
  registeredAt?: string;
}
export interface TeamRules {
  groups: number; qualifiers: number; groupSets: 1 | 3; knockoutSets: 1 | 3;
  gamesToWin: number; tiebreakPoints: number;
}
export interface SetScore { a: number; b: number; tieA?: number; tieB?: number }
export interface TeamMatch {
  id: string; a: string; b: string; group?: number; stage: number;
  court?: number; /** Assigned waiting court; legacy single-pick queues remain valid. */ nextOnCourt?: number; queueOrder?: number; state: "queued" | "active" | "completed"; sets: SetScore[]; winner?: string;
}
export interface TeamTournament {
  rules: TeamRules; teams: TournamentTeam[]; assignments: Record<string, number>;
  matches: TeamMatch[]; started: boolean; knockout: boolean; tieOrder: Record<string, number>;
  cohorts?: string[]; days?: number;
  competitions?: import("./teamCompetitions").TeamCompetition[];
  estimatedSetMinutes?: number;
  /** Start/end for days 2+ (index 0 = day 2). Day 1 uses the event time. Blank falls back to day 1. */
  dayTimes?: { time?: string; endTime?: string }[];
}
export const COHORT_LEVELS = ["Beginner", "Beginner +", "Intermediate", "Intermediate +", "Pro", "Pro +"] as const;
/** Team tournaments have no registration cap: more teams is better for organizers. */
export const OPEN_TEAM_CAPACITY = 999;
export const defaultTeamTournament = (): TeamTournament => ({
  rules: { groups: 2, qualifiers: 2, groupSets: 1, knockoutSets: 3, gamesToWin: 6, tiebreakPoints: 7 },
  teams: [], assignments: {}, matches: [], started: false, knockout: false, tieOrder: {}, cohorts: ["Intermediate"], days: 1,
});
export const phoneDigits = (v: string) => v.replace(/\D/g, "").slice(-10);
export const teamLabel = (team?: TournamentTeam) => team ? team.name || team.players.map(p => p.name).join(" / ") : "Bye";
/** Compact display name: first name plus last initial, so rows stay readable on a phone. */
export function shortName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]}\u00a0${parts[parts.length - 1].slice(0, 1)}.` : parts[0];
}
export const enteredTeams = (data: TeamTournament) => data.teams.filter(t => !t.waitlisted && !t.cancelled);
export const readyTeams = (data: TeamTournament) => enteredTeams(data).filter(t => t.players.every(p => p.checkedIn));
export function validateRules(rules: TeamRules, capacity: number) {
  if (!Number.isInteger(capacity) || capacity < 4) throw new Error("Choose at least four teams.");
  if (!Number.isInteger(rules.groups) || rules.groups < 2 || Math.floor(capacity / rules.groups) < 2) throw new Error("Each group needs at least two teams.");
  if (!Number.isInteger(rules.qualifiers) || rules.qualifiers < 1 || rules.qualifiers > Math.floor(capacity / rules.groups)) throw new Error("Qualification count exceeds the smallest group.");
  if (![1, 3].includes(rules.groupSets) || ![1, 3].includes(rules.knockoutSets)) throw new Error("Choose one set or best of three.");
  if (!Number.isInteger(rules.gamesToWin) || rules.gamesToWin < 2 || rules.gamesToWin > 6 || !Number.isInteger(rules.tiebreakPoints) || rules.tiebreakPoints < 2) throw new Error("Check set and tiebreak settings.");
}
export function registerTeam(data: TeamTournament, team: TournamentTeam, capacity: number) {
  if (data.started) throw new Error("Registration is closed after play starts.");
  const numbers = team.players.map(p => phoneDigits(p.phone));
  if (team.players.length !== 2 || team.players.some(p => p.name.trim().length < 2 || !/^[0-9]{10}$/.test(phoneDigits(p.phone)))) throw new Error("Enter both players’ names and valid mobile numbers.");
  if (numbers[0] === numbers[1] || data.teams.some(t => !t.cancelled && t.players.some(p => numbers.includes(phoneDigits(p.phone))))) throw new Error("A player can register only once in this tournament.");
  const full = enteredTeams(data).length >= capacity;
  return { ...data, teams: [...data.teams, { ...team, registeredAt: team.registeredAt ?? new Date().toISOString(), waitlisted: full || team.waitlisted, paid: full ? false : team.paid }] };
}
export function teamFee(price: number) { return price; }
export function moveTeam(data: TeamTournament, id: string, action: "promote" | "waitlist" | "cancel", capacity: number) {
  if (data.started) throw new Error("Team changes are locked after play starts.");
  if (action === "promote" && enteredTeams(data).length >= capacity) throw new Error("The team list is full.");
  return { ...data, teams: data.teams.map(t => t.id !== id ? t : { ...t, cancelled: action === "cancel", waitlisted: action === "waitlist" ? true : action === "promote" ? false : t.waitlisted, players: t.players.map(p => ({ ...p, checkedIn: false })) as [TeamPlayer, TeamPlayer] }) };
}
export function randomAssignments(data: TeamTournament, random = Math.random) {
  const list = [...readyTeams(data)];
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  return Object.fromEntries(list.map((t, i) => [t.id, i % data.rules.groups]));
}
export function groupDraw(data: TeamTournament, assignments: Record<string, number>) {
  const teams = readyTeams(data);
  validateRules(data.rules, teams.length);
  const sizes = Array.from({ length: data.rules.groups }, (_, g) => teams.filter(t => assignments[t.id] === g).length);
  if (teams.some(t => !Number.isInteger(assignments[t.id]) || assignments[t.id] < 0 || assignments[t.id] >= data.rules.groups) || sizes.some(n => n < Math.max(2, data.rules.qualifiers)) || Math.max(...sizes) - Math.min(...sizes) > 1) throw new Error("Assign every ready team to balanced groups with enough qualifying places.");
  const matches: TeamMatch[] = [];
  for (let group = 0; group < data.rules.groups; group++) {
    const ids = teams.filter(t => assignments[t.id] === group).map(t => t.id);
    robin(ids.length, ids).flat().forEach(([a, b]) => matches.push({ id: `g-${matches.length + 1}`, a, b, group, stage: 0, state: "queued", sets: [] }));
  }
  return { ...data, assignments, matches };
}
export function reassignGroup(data: TeamTournament, teamId: string, group: number, swapId?: string): TeamTournament {
  if (data.started) throw new Error("Group changes are locked after play starts.");
  const teams = readyTeams(data);
  if (!teams.some(t => t.id === teamId) || !Number.isInteger(group) || group < 0 || group >= data.rules.groups) throw new Error("Choose a checked-in team and valid group.");
  const assignments = { ...data.assignments, [teamId]: group };
  if (swapId) {
    const source = data.assignments[teamId];
    if (swapId === teamId || !teams.some(t => t.id === swapId) || data.assignments[swapId] !== group || !Number.isInteger(source)) throw new Error("Choose a team in the destination group to swap.");
    assignments[swapId] = source;
  }
  return { ...data, assignments, matches: [] };
}
export function activateCourts(data: TeamTournament, courts: number): TeamTournament {
  const matches = data.matches.map(m => ({ ...m }));
  const active = matches.filter(m => m.state === "active");
  const busy = new Set(active.flatMap(m => [m.a, m.b]));
  for (let court = 1; court <= courts; court++) {
    if (active.some(m => m.court === court)) continue;
    const next = matches.find(m => m.state === "queued" && !busy.has(m.a) && !busy.has(m.b));
    if (!next) continue;
    next.state = "active"; next.court = court; busy.add(next.a); busy.add(next.b);
  }
  return { ...data, matches };
}
export function startGroups(data: TeamTournament, courts: number) {
  if (data.started || !data.matches.length) throw new Error("Generate a group draw before starting.");
  const validated = groupDraw(data, data.assignments);
  if (JSON.stringify(validated.matches) !== JSON.stringify(data.matches)) throw new Error("The ready team list changed. Generate the draw again.");
  return activateCourts({ ...data, started: true }, courts);
}
/** Why a set's score is not finished yet, or null when it is a valid completed set. */
export function setProblem(set: SetScore, rules: TeamRules): string | null {
  const target = rules.gamesToWin;
  if (![set.a, set.b].every(n => Number.isInteger(n) && n >= 0)) return "Games must be whole non-negative numbers.";
  const hi = Math.max(set.a, set.b), lo = Math.min(set.a, set.b);
  const regular = hi === target && lo <= target - 2;
  const extended = hi === target + 1 && lo === target - 1;
  const tie = hi === target + 1 && lo === target;
  if (!regular && !extended && !tie) return `A set needs ${target} games, win by two, or a tiebreak at ${target}–${target}.`;
  if (tie) {
    const x = set.tieA, y = set.tieB;
    if (x === undefined || y === undefined || !Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || Math.max(x, y) < rules.tiebreakPoints || Math.abs(x - y) < 2 || (Math.max(x, y) > rules.tiebreakPoints && Math.abs(x - y) !== 2) || (set.a > set.b) !== (x > y)) return "Enter a valid tiebreak won by the set winner, with a two-point margin.";
  }
  return null;
}
/** True when a set has a valid finished score, using the same rule the match engine applies. */
export const isSetComplete = (set: SetScore, rules: TeamRules) => setProblem(set, rules) === null;
/** Sets each side has won so far. Incomplete sets do not count. */
export function countSetsWon(sets: SetScore[], rules: TeamRules) {
  return sets.reduce<{ a: number; b: number }>((tally, set) => isSetComplete(set, rules)
    ? (set.a > set.b ? { ...tally, a: tally.a + 1 } : { ...tally, b: tally.b + 1 }) : tally, { a: 0, b: 0 });
}
/** Sets a side must win to take the match. */
export const setsToWinMatch = (bestOf: number) => Math.floor(bestOf / 2) + 1;
export function matchWinner(sets: SetScore[], rules: TeamRules, bestOf: number): "a" | "b" {
  const required = setsToWinMatch(bestOf);
  let a = 0, b = 0;
  if (!sets.length || sets.length > bestOf) throw new Error("Enter the completed sets.");
  for (const set of sets) {
    if (a === required || b === required) throw new Error("No sets may follow the winning set.");
    const problem = setProblem(set, rules);
    if (problem) throw new Error(problem);
    if (set.a > set.b) a++; else b++;
  }
  if (a < required && b < required) throw new Error("The match does not have a winner yet.");
  return a > b ? "a" : "b";
}
export interface TeamStanding { id: string; played: number; wins: number; losses: number; sw: number; sl: number; gw: number; gl: number }
export function groupStandings(data: TeamTournament, group: number): TeamStanding[] {
  const rows = readyTeams(data).filter(t => data.assignments[t.id] === group).map(t => ({ id: t.id, played: 0, wins: 0, losses: 0, sw: 0, sl: 0, gw: 0, gl: 0 }));
  for (const m of data.matches.filter(m => m.group === group && m.state === "completed")) {
    for (const side of ["a", "b"] as const) {
      const row = rows.find(r => r.id === m[side]); if (!row) continue;
      row.played++; if (m.winner === row.id) row.wins++; else row.losses++;
      m.sets.forEach(s => { const own = s[side], other = s[side === "a" ? "b" : "a"]; row.gw += own; row.gl += other; if (own > other) row.sw++; else row.sl++; });
    }
  }
  // Rank by wins, then game difference. Tied clusters are ordered by
  // head-to-head results among their own members, with the host's manual
  // tie order breaking anything the results cannot (e.g. circular ties).
  const gameDiff = (r: TeamStanding) => r.gw - r.gl;
  const ordered = rows.sort((a, b) => b.wins - a.wins || gameDiff(b) - gameDiff(a));
  const result: TeamStanding[] = [];
  for (let i = 0; i < ordered.length;) {
    let j = i;
    while (j + 1 < ordered.length && ordered[j + 1].wins === ordered[i].wins && gameDiff(ordered[j + 1]) === gameDiff(ordered[i])) j++;
    const cluster = ordered.slice(i, j + 1);
    if (cluster.length > 1) {
      const h2h = headToHeadWins(data, group, cluster.map(r => r.id));
      cluster.sort((a, b) => h2h[b.id] - h2h[a.id] || (data.tieOrder[a.id] ?? Infinity) - (data.tieOrder[b.id] ?? Infinity));
    }
    result.push(...cluster);
    i = j + 1;
  }
  return result;
}
/** Head-to-head wins among a tied cluster, from completed group matches. */
export function headToHeadWins(data: TeamTournament, group: number, ids: string[]): Record<string, number> {
  const tally = Object.fromEntries(ids.map(id => [id, 0]));
  for (const m of data.matches) {
    if (m.group !== group || m.state !== "completed" || !m.winner) continue;
    if (!ids.includes(m.a) || !ids.includes(m.b)) continue;
    if (m.winner in tally) tally[m.winner]++;
  }
  return tally;
}
export function qualifierIds(data: TeamTournament) {
  if (!data.started || data.matches.some(m => m.stage === 0 && m.state !== "completed")) throw new Error("Complete all group matches first.");
  const groups = Array.from({ length: data.rules.groups }, (_, g) => {
    const rows = groupStandings(data, g);
    for (let i = 1; i < rows.length; i++) {
      const a = rows[i - 1], b = rows[i];
      if (a.wins !== b.wins || a.gw - a.gl !== b.gw - b.gl) continue;
      let start = i - 1, end = i;
      while (start > 0 && rows[start - 1].wins === a.wins && rows[start - 1].gw - rows[start - 1].gl === a.gw - a.gl) start--;
      while (end + 1 < rows.length && rows[end + 1].wins === a.wins && rows[end + 1].gw - rows[end + 1].gl === a.gw - a.gl) end++;
      const h2h = headToHeadWins(data, g, rows.slice(start, end + 1).map(r => r.id));
      if (h2h[a.id] !== h2h[b.id]) continue;
      if (!Number.isInteger(data.tieOrder[a.id]) || !Number.isInteger(data.tieOrder[b.id]) || data.tieOrder[a.id] < 1 || data.tieOrder[b.id] < 1 || data.tieOrder[a.id] === data.tieOrder[b.id]) throw new Error(`Resolve tied ranks in Group ${g + 1}.`);
    }
    return rows.slice(0, data.rules.qualifiers).map(r => r.id);
  });
  const seeds = groups.flatMap((ids, group) => ids.map((id, rank) => ({ id, group, rank }))).sort((a, b) => a.rank - b.rank || a.group - b.group);
  const byes = 2 ** Math.ceil(Math.log2(seeds.length)) - seeds.length;
  const result = seeds.splice(0, byes).map(seed => seed.id);
  // Higher-ranked qualifiers face lower ranks across groups. For four groups,
  // Group 1's winner meets Group 3's runner-up, then Group 2 meets Group 4.
  while (seeds.length) {
    const first = seeds.shift();
    if (!first) break;
    const preferred = (first.group + Math.ceil(groups.length / 2)) % groups.length;
    const candidates = seeds.map((seed, index) => ({ ...seed, index })).sort((a, b) => Number(a.group === first.group) - Number(b.group === first.group) || b.rank - a.rank || Number(b.group === preferred) - Number(a.group === preferred) || a.group - b.group);
    const opponent = candidates[0];
    result.push(first.id);
    if (opponent) result.push(seeds.splice(opponent.index, 1)[0].id);
  }
  return result;
}
/** Build once when rankings are resolved; ties never prevent saving the last score. */
export function generateQualifiedKnockout(data: TeamTournament): TeamTournament {
  const groups = data.matches.filter(m => m.stage === 0);
  if (data.knockout || !data.started || !groups.length || groups.some(m => m.state !== "completed")) return data;
  try {
    return confirmKnockout(data, qualifierIds(data), 0);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Resolve tied ranks")) return data;
    throw error;
  }
}
function knockoutRound(ids: string[], stage: number): TeamMatch[] {
  const size = 2 ** Math.ceil(Math.log2(ids.length));
  const byes = size - ids.length;
  const matches: TeamMatch[] = [];
  let index = 0;
  for (let i = 0; i < size / 2; i++) {
    const a = ids[index++], b = i < byes ? "" : ids[index++];
    matches.push({ id: `k-${stage}-${i + 1}`, a, b, stage, state: b ? "queued" : "completed", sets: [], winner: b ? undefined : a });
  }
  return matches;
}
export function confirmKnockout(data: TeamTournament, order: string[], courts: number) {
  if (data.knockout) throw new Error("Knockout draw is already locked.");
  const ids = qualifierIds(data);
  if (order.length !== ids.length || new Set(order).size !== ids.length || order.some(id => !ids.includes(id))) throw new Error("Place each qualifier in the draw exactly once.");
  return activateCourts({ ...data, knockout: true, matches: [...data.matches, ...knockoutRound(order, 1)] }, courts);
}
export function scoreTeamMatch(data: TeamTournament, id: string, sets: SetScore[], courts: number): TeamTournament {
  const match = data.matches.find(m => m.id === id);
  if (!match || !data.started || match.state === "queued" || !match.b) throw new Error("This match is not available for scoring.");
  if ((match.stage === 0 && data.knockout) || data.matches.some(m => m.stage > match.stage)) throw new Error("The next stage has been drawn; this result is locked.");
  const side = matchWinner(sets, data.rules, match.stage === 0 ? data.rules.groupSets : data.rules.knockoutSets);
  let next: TeamTournament = { ...data, matches: data.matches.map(m => m.id === id ? { ...m, sets, state: "completed", winner: m[side] } : m) };
  if (match.stage > 0) {
    const stage = next.matches.filter(m => m.stage === match.stage);
    if (stage.length > 1 && stage.every(m => m.state === "completed" && m.winner)) next = { ...next, matches: [...next.matches, ...knockoutRound(stage.map(m => m.winner ?? ""), match.stage + 1)] };
  }
  return activateCourts(next, courts);
}
export function champion(data: TeamTournament) {
  if (!data.knockout) return undefined;
  const stage = Math.max(...data.matches.map(m => m.stage));
  const last = data.matches.filter(m => m.stage === stage);
  return last.length === 1 && last[0].state === "completed" ? last[0].winner : undefined;
}
/** The team that won a finished match. Falls back to counting sets for results that predate winner tracking. */
export function completedWinner(match: TeamMatch): string | undefined {
  if (match.state !== "completed") return undefined;
  if (match.winner) return match.winner;
  if (!match.b) return match.a;
  const won = match.sets.reduce((n, s) => n + (s.a > s.b ? 1 : 0), 0);
  return won > match.sets.length - won ? match.a : won < match.sets.length - won ? match.b : undefined;
}