import { completedWinner, type TeamMatch, type TeamTournament } from "../../../lib/team/teamTournament";

export interface BracketSlot {
  match?: TeamMatch;
  number: number;
  sides: { teamId?: string; placeholder: string }[];
}

/** Future rounds are display-only; the tournament engine still owns progression. */
export function knockoutBracket(data: TeamTournament) {
  const opening = data.matches.filter(m => m.stage === 1);
  if (!opening.length) return [];
  const rounds: { stage: number; label: string; slots: BracketSlot[] }[] = [];
  let count = opening.length;
  let offset = data.matches.filter(m => m.stage === 0).length;
  for (let stage = 1; count >= 1; stage++, count /= 2) {
    const matches = data.matches.filter(m => m.stage === stage);
    const previous = rounds[rounds.length - 1];
    const slots = Array.from({ length: count }, (_, index): BracketSlot => {
      const match = matches[index];
      const sides = (["a", "b"] as const).map((side, sideIndex) => {
        const feeder = previous?.slots[index * 2 + sideIndex];
        const teamId = match?.[side] || (feeder?.match ? completedWinner(feeder.match) : undefined);
        return { teamId, placeholder: stage === 1 ? "Bye" : `Winner of M${feeder?.number ?? "–"}` };
      });
      return { match, number: offset + index + 1, sides };
    });
    rounds.push({ stage, label: count === 1 ? "Final" : count === 2 ? "Semifinals" : count === 4 ? "Quarterfinals" : `Round of ${count * 2}`, slots });
    offset += count;
  }
  return rounds;
}