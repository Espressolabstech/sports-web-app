import { MIN_SQUAD, rupees, spentBy } from './auction';

/** Squad limits. The server enforces the same values on every sale and correction (sports-api auction.budget.ts). */
export const FEMALE_MIN = 2;
export const FEMALE_MAX = 3;
export const MALE_MAX = 9;
export const SQUAD_MAX = 12;

export type BudgetLot = {
    id: string;
    number?: number | null;
    name?: string;
    status: 'WAITING' | 'LIVE' | 'SOLD' | 'UNSOLD';
    teamId: string | null;
    priceInr: number | null;
    categoryId: string | null;
    effectiveBasePriceInr: number;
    gender?: string | null;
    retained: boolean;
    reauctioned: boolean;
    soldAt?: string | null;
};
export type BudgetGroup = { id: string; name: string; sort: number; basePriceInr: number };
export type BudgetTeam = { id: string; name: string; purseInr: number };
export type BidContext = {
    lots: BudgetLot[];
    groups: BudgetGroup[];
    phase: 'CATEGORIES' | 'REAUCTION';
    currentGroupId: string | null;
    currentId: string | null;
};
export type OutReason = 'Squad full' | 'Has 9 male' | 'Has 3 female' | "Can't cover base";

export const isFemale = (l: { gender?: string | null } | undefined) => l?.gender === 'Female';

/** Players still purchasable in the current phase, cheapest first. */
export function availableLots({ lots, groups, phase, currentGroupId, currentId }: BidContext) {
    const currentGroup = groups.find((g) => g.id === currentGroupId);
    return lots
        .filter((l) => {
            const group = groups.find((g) => g.id === l.categoryId);
            if (!group || l.retained || l.status === 'SOLD') return false;
            if (l.id === currentId && l.status === 'LIVE') return true;
            if (l.status === 'UNSOLD') return !l.reauctioned;
            return phase === 'CATEGORIES' && l.status === 'WAITING' && (!currentGroup || group.sort >= currentGroup.sort);
        })
        .sort((a, b) => a.effectiveBasePriceInr - b.effectiveBasePriceInr || (a.number ?? 0) - (b.number ?? 0));
}

/** Gender-aware reserve: cheapest women for the minimum first, then the cheapest players within the caps. */
export function bidBudget(team: BudgetTeam, context: BidContext) {
    const { lots, groups, currentId } = context;
    const owned = lots.filter((l) => l.status === 'SOLD' && l.teamId === team.id);
    const remaining = Math.max(0, team.purseInr - spentBy(team.id, lots));
    const squad = owned.length;
    const femaleOwned = owned.filter(isFemale).length;
    const maleOwned = squad - femaleOwned;
    const eligible = availableLots(context);
    const canTake = (l: BudgetLot) => squad < SQUAD_MAX && (isFemale(l) ? femaleOwned < FEMALE_MAX : maleOwned < MALE_MAX);
    // Between draws use the cheapest player this team could legally buy.
    const candidate = currentId ? eligible.find((l) => l.id === currentId) : eligible.find(canTake);
    const candFemale = isFemale(candidate);
    let outReason: OutReason | null = null;
    if (squad >= SQUAD_MAX) outReason = 'Squad full';
    else if (candidate && !candFemale && maleOwned >= MALE_MAX) outReason = 'Has 9 male';
    else if (candidate && candFemale && femaleOwned >= FEMALE_MAX) outReason = 'Has 3 female';
    const f = femaleOwned + (candidate && candFemale ? 1 : 0);
    const m = squad + (candidate ? 1 : 0) - f;
    const spotsAfterBid = Math.max(0, MIN_SQUAD - squad - (candidate ? 1 : 0));
    const pool = eligible.filter((l) => l.id !== candidate?.id);
    const femaleNeeded = Math.max(0, FEMALE_MIN - femaleOwned);
    const femaleNeededAfterBid = Math.max(0, FEMALE_MIN - f);
    const reservePlayers: BudgetLot[] = [];
    let fcap = FEMALE_MAX - f;
    let mcap = MALE_MAX - m;
    for (const l of pool.filter(isFemale).slice(0, Math.min(spotsAfterBid, femaleNeededAfterBid))) {
        reservePlayers.push(l);
        fcap--;
    }
    for (const l of pool) {
        if (reservePlayers.length >= spotsAfterBid) break;
        if (reservePlayers.includes(l)) continue;
        if (isFemale(l) ? fcap > 0 : mcap > 0) {
            reservePlayers.push(l);
            if (isFemale(l)) fcap--;
            else mcap--;
        }
    }
    const reserve = reservePlayers.reduce((sum, l) => sum + l.effectiveBasePriceInr, 0);
    const enoughPlayers = reservePlayers.length === spotsAfterBid;
    const maxBid = candidate && enoughPlayers && !outReason ? Math.max(0, remaining - reserve) : null;
    const belowBase = maxBid !== null && !!candidate && maxBid < candidate.effectiveBasePriceInr;
    if (!outReason && belowBase) outReason = "Can't cover base";
    const breakdown = groups
        .slice()
        .sort((a, b) => a.sort - b.sort)
        .map((g) => ({ name: g.name, count: reservePlayers.filter((l) => l.categoryId === g.id).length, base: g.basePriceInr }))
        .filter((g) => g.count > 0);
    return {
        remaining, squad, spotsAfterBid, reserve, maxBid, enoughPlayers, belowBase, outReason, available: reservePlayers.length, breakdown,
        hasCandidate: !!candidate, femaleRemaining: eligible.filter(isFemale).length, femaleOwned, maleOwned, femaleNeeded, femaleNeededAfterBid,
        femaleAvailableAfterBid: pool.filter(isFemale).length,
    };
}

/** Squad dots: filled male/female, then open slots that must go to women, then open. */
export function squadDots(maleOwned: number, femaleOwned: number) {
    const total = maleOwned + femaleOwned;
    const size = total >= SQUAD_MAX ? SQUAD_MAX : MIN_SQUAD;
    const open = Math.max(0, size - total);
    const femaleOpen = Math.min(open, Math.max(0, FEMALE_MIN - femaleOwned));
    return [
        ...Array(maleOwned).fill('male'),
        ...Array(femaleOwned).fill('female'),
        ...Array(femaleOpen).fill('need'),
        ...Array(open - femaleOpen).fill('open'),
    ] as ('male' | 'female' | 'need' | 'open')[];
}

export function bidLimitError(team: BudgetTeam, context: BidContext, price: number): string | null {
    const b = bidBudget(team, context);
    if (b.outReason && b.outReason !== "Can't cover base") return `${team.name} is out for this player: ${b.outReason.toLowerCase()}`;
    if (b.maxBid === null) return `Not enough eligible players remain to reserve an ${MIN_SQUAD}-player squad`;
    return price > b.maxBid ? `Price exceeds the team’s maximum bid of ${rupees(b.maxBid)}` : null;
}
