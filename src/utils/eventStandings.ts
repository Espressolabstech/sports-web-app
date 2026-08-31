export interface EventStandingsRow {
    playerId: string;
    name: string;
    played: number;
    won: number;
    points: number;
}

export function computeEventStandings(event: ApiEvent): EventStandingsRow[] {
    const rows = new Map<string, EventStandingsRow>();

    for (const entrant of event.entrants) {
        rows.set(entrant.id, {
            playerId: entrant.id,
            name: entrant.name,
            played: 0,
            won: 0,
            points: 0,
        });
    }

    for (const round of event.rounds ?? []) {
        for (const match of round.matches) {
            if (match.scoreA === null || match.scoreB === null) continue;

            const sides: [string[], number, number][] = [
                [[match.teamAEntrant1Id, match.teamAEntrant2Id], match.scoreA, match.scoreB],
                [[match.teamBEntrant1Id, match.teamBEntrant2Id], match.scoreB, match.scoreA],
            ];

            for (const [team, own, opponent] of sides) {
                for (const playerId of team) {
                    const row = rows.get(playerId);
                    if (!row) continue;
                    row.played += 1;
                    row.points += own;
                    if (own > opponent) row.won += 1;
                }
            }
        }
    }

    return [...rows.values()].sort(
        (a, b) => b.points - a.points || b.won - a.won || a.name.localeCompare(b.name),
    );
}
