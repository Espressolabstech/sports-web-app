import { groupStandings, type TeamTournament } from "../../../lib/team/teamTournament";

/** Qualification-zone styling is provisional until the engine creates the draw. */
export function standingsView(data: TeamTournament, group: number) {
  const standings = groupStandings(data, group);
  const hasResults = standings.some(row => row.played > 0);
  const qualifiers = new Set(data.matches.filter(match => match.stage === 1).flatMap(match => [match.a, match.b]).filter(Boolean));
  return standings.map((row, index) => ({
    ...row,
    rank: index + 1,
    qualifying: data.knockout ? qualifiers.has(row.id) : hasResults && index < data.rules.qualifiers,
    confirmed: data.knockout && qualifiers.has(row.id),
  }));
}