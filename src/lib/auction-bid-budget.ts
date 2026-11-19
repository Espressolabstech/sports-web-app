import { MIN_SQUAD, rupees, spentBy } from './auction';

/** Squad limits. The server enforces the same values on every sale and correction (sports-api auction.budget.ts). */
export const FEMALE_MIN = 2;
export const FEMALE_MAX = 2;
export const MALE_MAX = 9;
export const SQUAD_MAX = 12;
/** At most 3 players from the top categories (A ₹6,000 and B ₹5,000) combined, retained players included. */
export const TOP_CATEGORY_MAX = 3;
export const TOP_CATEGORY_MIN_BASE = 5000;
export const isTopCategory = (l: { effectiveBasePriceInr: number } | undefined) => (l?.effectiveBasePriceInr ?? 0) >= TOP_CATEGORY_MIN_BASE;

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
    /** Manual rounds (any order): every waiting or unsold player can still be bought. 'complete' = closed. */
    round?: string | null;
};
export type OutReason = 'Squad full' | 'Has 9 male' | 'Has 2 female' | 'Has 3 from A/B' | 'Has 5 from C' | 'Has 5 from D' | 'Needs C/D' | "Can't cover base";

export const isFemale = (l: { gender?: string | null } | undefined) => l?.gender === 'Female';

/** Players still purchasable in the current phase, cheapest first. */
export function availableLots({ lots, groups, phase, currentGroupId, currentId, round }: BidContext) {
    const currentGroup = groups.find((g) => g.id === currentGroupId);
    return lots
        .filter((l) => {
            const group = groups.find((g) => g.id === l.categoryId);
            if (!group || l.retained || l.status === 'SOLD') return false;
            if (l.id === currentId && l.status === 'LIVE') return true;
            if (round) return l.status === 'WAITING' || l.status === 'UNSOLD';
            if (l.status === 'UNSOLD') return !l.reauctioned;
            return phase === 'CATEGORIES' && l.status === 'WAITING' && (!currentGroup || group.sort >= currentGroup.sort);
        })
        .sort((a, b) => a.effectiveBasePriceInr - b.effectiveBasePriceInr || (a.number ?? 0) - (b.number ?? 0));
}

/** Category C and Category D: every team needs 2–5 players from each, retained players included (sports-api auction.budget.ts). */
export const CATEGORY_MIN = 2;
export const CATEGORY_MAX = 5;
type LimitedCategory = 'C' | 'D';
const letterOf = (name: string | undefined) => {
    const letters = (name ?? '').replace(/[^A-Za-z]/g, '');
    return letters ? letters.slice(-1).toUpperCase() : '';
};

/** The cheapest legal way to finish the squad: the female minimum, then the Category C and D minimums, then the cheapest within every cap. */
export function bidBudget(team: BudgetTeam, context: BidContext) {
    const { lots, groups, currentId } = context;
    const limitedCategory = (l: BudgetLot | undefined): LimitedCategory | null => {
        const letter = letterOf(groups.find((g) => g.id === l?.categoryId)?.name);
        return letter === 'C' || letter === 'D' ? letter : null;
    };
    const hasCategory = (c: LimitedCategory) => groups.some((g) => letterOf(g.name) === c);
    const owned = lots.filter((l) => l.status === 'SOLD' && l.teamId === team.id);
    const remaining = Math.max(0, team.purseInr - spentBy(team.id, lots));
    const squad = owned.length;
    const femaleOwned = owned.filter(isFemale).length;
    const maleOwned = squad - femaleOwned;
    const topOwned = owned.filter(isTopCategory).length;
    const ownedIn = (c: LimitedCategory) => owned.filter((l) => limitedCategory(l) === c).length;
    const ownedC = ownedIn('C');
    const ownedD = ownedIn('D');
    const eligible = availableLots(context);
    const canTake = (l: BudgetLot) => {
        const c = limitedCategory(l);
        return (
            squad < SQUAD_MAX &&
            (isFemale(l) ? femaleOwned < FEMALE_MAX : maleOwned < MALE_MAX) &&
            (!isTopCategory(l) || topOwned < TOP_CATEGORY_MAX) &&
            (!c || ownedIn(c) < CATEGORY_MAX)
        );
    };
    // Between draws use the cheapest player this team could legally buy.
    const candidate = currentId ? eligible.find((l) => l.id === currentId) : eligible.find(canTake);
    const candFemale = isFemale(candidate);
    const candCat = limitedCategory(candidate);
    let outReason: OutReason | null = null;
    if (squad >= SQUAD_MAX) outReason = 'Squad full';
    else if (candidate && !candFemale && maleOwned >= MALE_MAX) outReason = 'Has 9 male';
    else if (candidate && candFemale && femaleOwned >= FEMALE_MAX) outReason = 'Has 2 female';
    else if (candidate && isTopCategory(candidate) && topOwned >= TOP_CATEGORY_MAX) outReason = 'Has 3 from A/B';
    else if (candCat && ownedIn(candCat) >= CATEGORY_MAX) outReason = candCat === 'C' ? 'Has 5 from C' : 'Has 5 from D';
    const f = femaleOwned + (candidate && candFemale ? 1 : 0);
    const m = squad + (candidate ? 1 : 0) - f;
    const spotsAfterBid = Math.max(0, MIN_SQUAD - squad - (candidate ? 1 : 0));
    const pool = eligible.filter((l) => l.id !== candidate?.id);
    const femaleNeeded = Math.max(0, FEMALE_MIN - femaleOwned);
    const femaleNeededAfterBid = Math.max(0, FEMALE_MIN - f);
    const after = { C: ownedC + (candCat === 'C' ? 1 : 0), D: ownedD + (candCat === 'D' ? 1 : 0) };
    const catNeed = {
        C: hasCategory('C') ? Math.max(0, CATEGORY_MIN - after.C) : 0,
        D: hasCategory('D') ? Math.max(0, CATEGORY_MIN - after.D) : 0,
    };
    // What the squad still needs from C and D after this player (shown to the organizer).
    const categoryNeedAfterBid = { ...catNeed };
    if (!outReason && candidate && catNeed.C + catNeed.D > spotsAfterBid) outReason = 'Needs C/D';
    const room = {
        female: FEMALE_MAX - f,
        male: MALE_MAX - m,
        top: TOP_CATEGORY_MAX - topOwned - (candidate && isTopCategory(candidate) ? 1 : 0),
        C: CATEGORY_MAX - after.C,
        D: CATEGORY_MAX - after.D,
    };
    const fits = (l: BudgetLot) => {
        const c = limitedCategory(l);
        return (isFemale(l) ? room.female > 0 : room.male > 0) && (!isTopCategory(l) || room.top > 0) && (!c || room[c] > 0);
    };
    const reservePlayers: BudgetLot[] = [];
    const take = (l: BudgetLot) => {
        reservePlayers.push(l);
        if (isFemale(l)) room.female--;
        else room.male--;
        if (isTopCategory(l)) room.top--;
        const c = limitedCategory(l);
        if (c) {
            room[c]--;
            catNeed[c] = Math.max(0, catNeed[c] - 1);
        }
    };
    const fill = (want: () => number, match: (l: BudgetLot) => boolean) => {
        for (const l of pool) {
            if (want() <= 0 || reservePlayers.length >= spotsAfterBid) break;
            if (!reservePlayers.includes(l) && match(l) && fits(l)) take(l);
        }
    };
    let femaleLeft = Math.min(spotsAfterBid, femaleNeededAfterBid);
    // Women first — but never so many that the C and D minimums no longer fit.
    fill(
        () => Math.min(femaleLeft, spotsAfterBid - reservePlayers.length - Math.max(0, catNeed.C + catNeed.D - femaleLeft)),
        (l) => {
            const ok = isFemale(l);
            if (ok) femaleLeft--;
            return ok;
        },
    );
    fill(() => catNeed.C, (l) => limitedCategory(l) === 'C');
    fill(() => catNeed.D, (l) => limitedCategory(l) === 'D');
    const categoryShort = catNeed.C + catNeed.D > 0;
    if (!categoryShort) fill(() => spotsAfterBid - reservePlayers.length, () => true);
    const reserve = reservePlayers.reduce((sum, l) => sum + l.effectiveBasePriceInr, 0);
    const enoughPlayers = !categoryShort && reservePlayers.length === spotsAfterBid;
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
        /** The team's category mix right now, and what C and D still need after this player. */
        topOwned, ownedC, ownedD, categoryNeedAfterBid, categoryShort,
    };
}

export type SquadSlot<L> = { n: number; lot?: L; need?: boolean; optional?: boolean };

/**
 * Eleven fixed slots (the squad size): purchases first, then female-need slots, then open.
 * No empty "optional" 12th slot is shown; a team that does buy a 12th player (the maximum) still shows them.
 */
export function squadSlots<L>(squad: L[], femaleNeeded: number): SquadSlot<L>[] {
    const filled = squad.length;
    const size = Math.min(SQUAD_MAX, Math.max(MIN_SQUAD, filled));
    return Array.from({ length: size }, (_, i) => i + 1).map<SquadSlot<L>>((n) => {
        const lot = squad[n - 1];
        if (lot) return { n, lot };
        if (n - filled <= femaleNeeded) return { n, need: true };
        return { n };
    });
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
