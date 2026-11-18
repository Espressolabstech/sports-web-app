/**
 * Player names are shown in one consistent style, whatever was typed at registration:
 * "MANISH SOMANI" / "shivam  patel" → "Manish Somani" / "Shivam Patel". Display only — the database keeps what was entered.
 * The letter after an apostrophe, hyphen or full stop is capitalised too ("D'Souza", "Shah-Mehta", "A.K. Rao").
 */
export function properName(name: string): string {
    return name
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .replace(/(^|[\s'’\-.])(\p{L})/gu, (_m, sep: string, letter: string) => sep + letter.toUpperCase());
}

/** Response keys whose objects are players; only their `name` is formatted (team names, event titles and venues are left alone). */
const PLAYER_KEYS = new Set(['entrants', 'entrant', 'friendEntrant', 'players', 'player', 'lots', 'lot', 'standings']);

function formatPlayer(value: unknown) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const player = value as { name?: unknown };
        if (typeof player.name === 'string') player.name = properName(player.name);
    }
}

/** Walks an API response once and formats every player's name in place. */
export function formatPlayerNames<T>(data: T): T {
    const walk = (node: unknown) => {
        if (Array.isArray(node)) return node.forEach(walk);
        if (!node || typeof node !== 'object') return;
        for (const [key, value] of Object.entries(node)) {
            if (PLAYER_KEYS.has(key)) {
                if (Array.isArray(value)) value.forEach(formatPlayer);
                else formatPlayer(value);
            }
            walk(value);
        }
    };
    walk(data);
    return data;
}
