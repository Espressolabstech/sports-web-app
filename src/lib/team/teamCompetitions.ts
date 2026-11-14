import { champion, defaultTeamTournament, enteredTeams, generateQualifiedKnockout, scoreTeamMatch, type SetScore, type TeamTournament } from "./teamTournament";

export interface TeamCompetition { id: string; levels: string[]; data: TeamTournament }
export function competitions(data: TeamTournament): TeamCompetition[] {
  if (data.competitions?.length) return data.competitions;
  const levels = data.cohorts?.length ? data.cohorts : ["Open"];
  return [{ id: "cohort-all", levels, data: { ...data, competitions: undefined } }];
}
export function competitionData(root: TeamTournament, competition: TeamCompetition): TeamTournament {
  const list = competitions(root);
  return { ...competition.data, competitions: undefined, teams: root.teams.filter(t => t.cohort ? competition.levels.includes(t.cohort) : list.length === 1) };
}
export function saveCompetition(root: TeamTournament, id: string, next: TeamTournament): TeamTournament {
  const ids = new Set(next.teams.map(t => t.id));
  const list = competitions(root).map(c => c.id === id ? { ...c, data: { ...next, competitions: undefined } } : c);
  return { ...root, teams: root.teams.map(t => ids.has(t.id) ? next.teams.find(n => n.id === t.id) ?? t : t), competitions: list, matches: list.flatMap(c => c.data.matches), started: list.some(c => c.data.started), knockout: list.every(c => c.data.knockout) };
}
export function combineCompetitions(root: TeamTournament, ids: string[]): TeamTournament {
  if (root.started) throw new Error("Cohorts are locked after play starts.");
  const list = competitions(root), selected = list.filter(c => ids.includes(c.id));
  if (selected.length < 2) throw new Error("Select at least two cohorts to combine.");
  const merged: TeamCompetition = { id: selected[0].id, levels: selected.flatMap(c => c.levels), data: { ...defaultTeamTournament(), rules: { ...selected[0].data.rules } } };
  return { ...root, competitions: [...list.filter(c => !ids.includes(c.id)), merged], matches: [] };
}
export function separateCompetition(root: TeamTournament, id: string): TeamTournament {
  if (root.started) throw new Error("Cohorts are locked after play starts.");
  const list = competitions(root), selected = list.find(c => c.id === id);
  if (!selected) return root;
  return { ...root, competitions: list.flatMap(c => c.id !== id ? [c] : c.levels.map((level, i) => ({ id: `${id}-${i}`, levels: [level], data: { ...defaultTeamTournament(), rules: { ...c.data.rules } } }))), matches: [] };
}
export function scheduleCompetitions(root: TeamTournament, courts: number): TeamTournament {
  if (!root.competitions?.length) return root;
  const list = root.competitions.map(c => ({ ...c, data: { ...c.data, matches: c.data.matches.map(m => ({ ...m })) } }));
  const busy = new Set<string>(), occupied = new Set<number>();
  for (const c of list) for (const m of c.data.matches.filter(m => m.state === "active")) {
    if (m.court && m.court <= courts && !occupied.has(m.court) && !busy.has(m.a) && !busy.has(m.b)) { occupied.add(m.court); busy.add(m.a); busy.add(m.b); }
    else { m.state = "queued"; m.court = undefined; }
  }
  // Scheduling repairs conflicts only; scoring promotes explicitly court-lined-up games.
  return { ...root, competitions: list, matches: list.flatMap(c => c.data.matches) };
}
/** Courts not currently hosting a live match in any cohort. */
export function freeCourts(root: TeamTournament, courts: number): number[] {
  const used = new Set(competitions(root).flatMap(c => c.data.matches).filter(m => m.state === "active").map(m => m.court));
  return Array.from({ length: courts }, (_, i) => i + 1).filter(c => !used.has(c));
}
/** Teams in a live match anywhere in the event. */
export function busyTeams(root: TeamTournament): Set<string> {
  return new Set(competitions(root).flatMap(c => c.data.matches).filter(m => m.state === "active").flatMap(m => [m.a, m.b]));
}
export type UpNextEntry = { competitionId: string; match: TeamTournament["matches"][number] };
/** One event-wide ordered list; legacy per-court picks (nextOnCourt only) sort first. */
export function upNext(root: TeamTournament): UpNextEntry[] {
  return competitions(root).flatMap(c => c.data.matches.filter(m => m.state === "queued" && (m.queueOrder !== undefined || m.nextOnCourt !== undefined)).map(match => ({ competitionId: c.id, match })))
    .sort((a, b) => (a.match.queueOrder ?? 0) - (b.match.queueOrder ?? 0));
}
function writeOrder(root: TeamTournament, entries: UpNextEntry[]): TeamTournament {
  let next = root;
  for (const c of competitions(root)) {
    next = saveCompetition(next, c.id, { ...competitionData(next, c), matches: c.data.matches.map(m => {
      if (m.state !== "queued") return m;
      const i = entries.findIndex(e => e.competitionId === c.id && e.match.id === m.id);
      return i < 0 ? { ...m, nextOnCourt: undefined, queueOrder: undefined } : { ...m, nextOnCourt: undefined, queueOrder: i + 1 };
    }) });
  }
  return next;
}
const same = (e: UpNextEntry, competitionId: string, matchId: string) => e.competitionId === competitionId && e.match.id === matchId;
export function addToUpNext(root: TeamTournament, competitionId: string, matchId: string): TeamTournament {
  const target = competitions(root).find(c => c.id === competitionId)?.data.matches.find(m => m.id === matchId);
  if (!target || target.state !== "queued" || !target.b) throw new Error("This match can't be queued.");
  const list = upNext(root);
  if (list.some(e => same(e, competitionId, matchId))) return root;
  return writeOrder(root, [...list, { competitionId, match: target }]);
}
/** Append every known playable fixture, rotating fairly between cohort/group buckets.
 * Preserve manually arranged entries and never invent future knockout matches or start courts.
 */
export function generateUpNext(root: TeamTournament): TeamTournament {
  const entries = upNext(root);
  const buckets = competitions(root).filter(c => c.data.started).flatMap(c => {
    const keys = [...new Set(c.data.matches.filter(m => m.b).map(m => m.stage === 0 ? `group-${m.group}` : `stage-${m.stage}`))];
    return keys.map(key => {
      const matches = c.data.matches.filter(m => m.b && (m.stage === 0 ? `group-${m.group}` : `stage-${m.stage}`) === key);
      return {
        served: matches.filter(m => m.state !== "queued" || entries.some(e => same(e, c.id, m.id))).length,
        pending: matches.filter(m => m.state === "queued" && !entries.some(e => same(e, c.id, m.id))).map(match => ({ competitionId: c.id, match })),
      };
    });
  });
  while (true) {
    const bucket = buckets.filter(b => b.pending.length).sort((a, b) => a.served - b.served)[0];
    if (!bucket) break;
    const entry = bucket.pending.shift();
    if (entry) { entries.push(entry); bucket.served += 1; }
  }
  return writeOrder(root, entries);
}
export function removeFromUpNext(root: TeamTournament, competitionId: string, matchId: string): TeamTournament {
  return writeOrder(root, upNext(root).filter(e => !same(e, competitionId, matchId)));
}
export function moveUpNext(root: TeamTournament, competitionId: string, matchId: string, direction: -1 | 1): TeamTournament {
  const list = upNext(root), i = list.findIndex(e => same(e, competitionId, matchId)), j = i + direction;
  if (i < 0 || j < 0 || j >= list.length) return root;
  [list[i], list[j]] = [list[j], list[i]];
  return writeOrder(root, list);
}
/** First Up next match whose teams are both free; blocked matches are skipped but keep their place. */
export function nextEligible(root: TeamTournament): UpNextEntry | undefined {
  const busy = busyTeams(root);
  return upNext(root).find(e => e.match.b && !busy.has(e.match.a) && !busy.has(e.match.b) && competitions(root).find(c => c.id === e.competitionId)?.data.started);
}
/** The host taps a free court: load the first eligible queued match straight onto it. */
export function startNextFromQueue(root: TeamTournament, court: number, courts: number): TeamTournament {
  const head = nextEligible(root);
  if (!head) throw new Error("Nothing in the queue is free to play right now.");
  return makeMatchLive(root, head.competitionId, head.match.id, court, courts);
}
export function makeMatchLive(root: TeamTournament, competitionId: string, matchId: string, court: number, courts: number): TeamTournament {
  const competition = competitions(root).find(c => c.id === competitionId);
  const match = competition?.data.matches.find(m => m.id === matchId);
  if (!competition || !match || !competition.data.started || match.state !== "queued" || !match.b) throw new Error("This match can't go live.");
  if (!freeCourts(root, courts).includes(court)) throw new Error(`Court ${court} is in use.`);
  const busy = busyTeams(root);
  if (busy.has(match.a) || busy.has(match.b)) throw new Error("One of these teams is already on court.");
  const data = { ...competition.data, matches: competition.data.matches.map(m => m.id === matchId ? { ...m, state: "active" as const, court, nextOnCourt: undefined, queueOrder: undefined } : m) };
  return saveCompetition(root, competitionId, { ...competitionData(root, competition), matches: data.matches });
}
/** Save a result, then fill free courts from the shared Up next list. */
export function scoreCompetitionMatch(root: TeamTournament, competitionId: string, matchId: string, sets: SetScore[], courts: number): TeamTournament {
  const competition = competitions(root).find(c => c.id === competitionId);
  if (!competition) throw new Error("Competition not found.");
  const match = competition.data.matches.find(m => m.id === matchId);
  const next = saveCompetition(root, competitionId, generateQualifiedKnockout(scoreTeamMatch(competitionData(root, competition), matchId, sets, 0)));
  // Corrections do not start games.
  if (match?.state !== "active") return next;
  return fillFreeCourts(next, courts);
}
export function fillFreeCourts(root: TeamTournament, courts: number): TeamTournament {
  let next = root;
  for (const court of freeCourts(next, courts)) {
    const head = nextEligible(next);
    if (!head) break;
    next = makeMatchLive(next, head.competitionId, head.match.id, court, courts);
  }
  return next;
}
/** Legacy wrapper: any court adds to the shared list; undefined removes. */
export function queueMatchForCourt(root: TeamTournament, competitionId: string, matchId: string, court: number | undefined): TeamTournament {
  if (court !== undefined && (!Number.isInteger(court) || court < 1)) throw new Error("Choose a valid court.");
  return court === undefined ? removeFromUpNext(root, competitionId, matchId) : addToUpNext(root, competitionId, matchId);
}
export type CohortStage = "registration" | "ready" | "live" | "finished";
export function cohortStage(data: TeamTournament): CohortStage {
  if (data.started && champion(data)) return "finished";
  if (data.started) return "live";
  return enteredTeams(data).filter(t => t.players.every(p => p.checkedIn)).length >= 4 ? "ready" : "registration";
}
export function returnMatchToQueue(root: TeamTournament, competitionId: string, matchId: string): TeamTournament {
  const competition = competitions(root).find(c => c.id === competitionId);
  if (!competition) return root;
  const matches = competition.data.matches.map(m => m.id === matchId && m.state === "active" ? { ...m, state: "queued" as const, court: undefined } : m);
  return saveCompetition(root, competitionId, { ...competitionData(root, competition), matches });
}
export function checkInTeam(data: TeamTournament, id: string, checked: boolean): TeamTournament {
  if (data.started) throw new Error("Check-in is locked after play starts.");
  const team = data.teams.find(t => t.id === id);
  if (!team || team.cancelled || team.waitlisted) throw new Error("Only registered teams can check in.");
  return { ...data, matches: [], teams: data.teams.map(t => t.id === id ? { ...t, players: [{ ...t.players[0], checkedIn: checked }, { ...t.players[1], checkedIn: checked }] } : t) };
}
export function competitionFinished(root: TeamTournament) {
  return root.started && competitions(root).every(c => enteredTeams(competitionData(root, c)).length === 0 || Boolean(champion(competitionData(root, c))));
}
export function teamTimeEstimate(data: TeamTournament, teamCount: number, courts: number) {
  const sizes = Array.from({ length: data.rules.groups }, (_, i) => Math.floor(teamCount / data.rules.groups) + (i < teamCount % data.rules.groups ? 1 : 0));
  const groups = sizes.reduce((sum, size) => sum + size * (size - 1) / 2, 0);
  const qualifiers = Math.min(teamCount, data.rules.groups * data.rules.qualifiers);
  const knockout = Math.max(0, qualifiers - 1);
  const minutes = data.estimatedSetMinutes ?? 25;
  const groupSlots = Math.max(Math.ceil(groups / Math.max(1, courts)), Math.max(0, ...sizes.map(n => n % 2 ? n : n - 1)));
  let knockoutSlots = 0, remaining = qualifiers;
  while (remaining > 1) { const playing = remaining - 2 ** Math.floor(Math.log2(remaining - 1)); knockoutSlots += Math.ceil(playing / Math.max(1, courts)); remaining -= playing; }
  return { groups, knockout, minutes: Math.ceil((groupSlots * data.rules.groupSets + knockoutSlots * data.rules.knockoutSets) * minutes) };
}