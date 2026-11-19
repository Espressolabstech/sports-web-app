import { MIN_SQUAD, rupees, spentBy } from './auction';

/** Squad limits. The server enforces the same values on every sale and correction (sports-api auction.budget.ts). */
export const FEMALE_MIN = 2;
export const FEMALE_MAX = 2;
export const MALE_MAX = 9;
export const SQUAD_MAX = 12;
/** At most 3 male players from the top categories (A ₹6,000 and B ₹5,000) combined, retained players included. */
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

/** Category C and Category D: every team needs 2–5 male players from each, retained players included (sports-api auction.budget.ts).
 *  Women don't count toward any category limit. */
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
    // Category limits count men only.
    const ownedMen = owned.filter((l) => !isFemale(l));
    const topOwned = ownedMen.filter(isTopCategory).length;
    const ownedIn = (c: LimitedCategory) => ownedMen.filter((l) => limitedCategory(l) === c).length;
    const ownedC = ownedIn('C');
    const ownedD = ownedIn('D');
    const eligible = availableLots(context);
    const canTake = (l: BudgetLot) => {
        if (squad >= SQUAD_MAX) return false;
        if (isFemale(l)) return femaleOwned < FEMALE_MAX;
        const c = limitedCategory(l);
        return maleOwned < MALE_MAX && (!isTopCategory(l) || topOwned < TOP_CATEGORY_MAX) && (!c || ownedIn(c) < CATEGORY_MAX);
    };
    // Between draws: the cheapest player this team could legally buy from the open round (the next call comes from it —
    // e.g. an A/B man in the A + B round, not a cheap D man); with no round open, or none left in it, the cheapest overall.
    const round = context.round && context.round !== 'complete' ? context.round : null;
    const inOpenRound = (l: BudgetLot) => {
        if (!round || !l.categoryId) return false;
        const female = isFemale(l);
        if (round === 'female') return female;
        if (female) return false;
        const letter = letterOf(groups.find((g) => g.id === l.categoryId)?.name);
        return round === 'ab' ? letter === 'A' || letter === 'B' : letter === round.toUpperCase();
    };
    const candidate = currentId
        ? eligible.find((l) => l.id === currentId)
        : (eligible.find((l) => inOpenRound(l) && canTake(l)) ?? eligible.find(canTake));
    const candFemale = isFemale(candidate);
    const candTop = !!candidate && !candFemale && isTopCategory(candidate);
    const candCat = candFemale ? null : limitedCategory(candidate);
    let outReason: OutReason | null = null;
    if (squad >= SQUAD_MAX) outReason = 'Squad full';
    else if (candidate && !candFemale && maleOwned >= MALE_MAX) outReason = 'Has 9 male';
    else if (candidate && candFemale && femaleOwned >= FEMALE_MAX) outReason = 'Has 2 female';
    else if (candTop && topOwned >= TOP_CATEGORY_MAX) outReason = 'Has 3 from A/B';
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
        top: TOP_CATEGORY_MAX - topOwned - (candTop ? 1 : 0),
        C: CATEGORY_MAX - after.C,
        D: CATEGORY_MAX - after.D,
    };
    // The cheapest legal way to finish the squad, within every limit (see cheapestFill — same as the server).
    const picks = cheapestFill(
        pool.map((l) => {
            const c = limitedCategory(l);
            return { item: l, cost: l.effectiveBasePriceInr, female: isFemale(l), group: isTopCategory(l) ? ('AB' as const) : (c ?? ('X' as const)) };
        }),
        {
            spots: spotsAfterBid,
            femaleMin: femaleNeededAfterBid,
            femaleMax: room.female,
            maleMax: room.male,
            abMax: room.top,
            cMin: catNeed.C,
            cMax: room.C,
            dMin: catNeed.D,
            dMax: room.D,
        },
    );
    const reservePlayers: BudgetLot[] = picks ?? [];
    const categoryShort = !picks && catNeed.C + catNeed.D > 0;
    const reserve = reservePlayers.reduce((sum, l) => sum + l.effectiveBasePriceInr, 0);
    const enoughPlayers = !!picks;
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

/** A player the reserve could count on: their base price, gender and limit group (A+B together, C, D, or none). */
export type FillItem<T> = { item: T; cost: number; female: boolean; group: 'AB' | 'C' | 'D' | 'X' };
export type FillLimits = {
    spots: number;
    femaleMin: number;
    femaleMax: number;
    maleMax: number;
    abMax: number;
    cMin: number;
    cMax: number;
    dMin: number;
    dMax: number;
};

/**
 * The cheapest set of exactly `spots` players that keeps every squad limit, or null when no set fits.
 * Tries every split of the spots across women/men × (A+B, C, D, other) — a few thousand combinations at most —
 * so it never misses a legal squad the way "cheapest first" can (e.g. cheap Category D women using up the D places
 * when the only A/B players left are women). The female minimum is advisory when too few women exist at all.
 * Category limits (A+B, C, D) count men only; women are limited only by the female minimum/maximum.
 */
export function cheapestFill<T>(pool: FillItem<T>[], lim: FillLimits): T[] | null {
    if (lim.spots <= 0) return [];
    const GROUPS = ['AB', 'C', 'D', 'X'] as const;
    type G = (typeof GROUPS)[number];
    const bucket = (g: G, female: boolean) => pool.filter((p) => p.group === g && p.female === female).sort((a, b) => a.cost - b.cost);
    const women = new Map(GROUPS.map((g) => [g, bucket(g, true)]));
    const men = new Map(GROUPS.map((g) => [g, bucket(g, false)]));
    const prefix = (list: FillItem<T>[]) => list.reduce<number[]>((acc, p) => [...acc, acc[acc.length - 1] + p.cost], [0]);
    const wCost = new Map(GROUPS.map((g) => [g, prefix(women.get(g)!)]));
    const mCost = new Map(GROUPS.map((g) => [g, prefix(men.get(g)!)]));
    const womenAvailable = GROUPS.reduce((n, g) => n + women.get(g)!.length, 0);
    const wMin = Math.min(lim.femaleMin, womenAvailable, lim.spots);
    const wMax = Math.min(lim.femaleMax, lim.spots);
    const range = (max: number) => Array.from({ length: Math.max(0, max) + 1 }, (_, i) => i);

    let best: { cost: number; w: Record<G, number>; m: Record<G, number> } | null = null;
    for (const wAB of range(Math.min(wMax, women.get('AB')!.length)))
        for (const wC of range(Math.min(wMax - wAB, women.get('C')!.length)))
            for (const wD of range(Math.min(wMax - wAB - wC, women.get('D')!.length)))
                for (const wX of range(Math.min(wMax - wAB - wC - wD, women.get('X')!.length))) {
                    const w = wAB + wC + wD + wX;
                    if (w < wMin) continue;
                    const m = lim.spots - w;
                    if (m < 0 || m > lim.maleMax) continue;
                    for (const mC of range(Math.min(m, men.get('C')!.length, lim.cMax)))
                        for (const mD of range(Math.min(m - mC, men.get('D')!.length, lim.dMax)))
                            for (const mAB of range(Math.min(m - mC - mD, men.get('AB')!.length, lim.abMax))) {
                                const mX = m - mC - mD - mAB;
                                if (mX > men.get('X')!.length) continue;
                                if (mC < lim.cMin || mD < lim.dMin) continue;
                                const cost =
                                    wCost.get('AB')![wAB] + wCost.get('C')![wC] + wCost.get('D')![wD] + wCost.get('X')![wX] +
                                    mCost.get('AB')![mAB] + mCost.get('C')![mC] + mCost.get('D')![mD] + mCost.get('X')![mX];
                                if (!best || cost < best.cost) {
                                    best = { cost, w: { AB: wAB, C: wC, D: wD, X: wX }, m: { AB: mAB, C: mC, D: mD, X: mX } };
                                }
                            }
                }
    if (!best) return null;
    const chosen = best;
    return GROUPS.flatMap((g) => [...women.get(g)!.slice(0, chosen.w[g]), ...men.get(g)!.slice(0, chosen.m[g])].map((p) => p.item));
}

/** Male players owned per category vs the minimum and maximum (A 0–3, B 0–3, C 2–5, D 2–5); shown on the squad cards. Women are separate. */
export const CAT_MIN: Record<string, number> = { A: 0, B: 0, C: CATEGORY_MIN, D: CATEGORY_MIN };
export const CAT_MAX: Record<string, number> = { A: TOP_CATEGORY_MAX, B: TOP_CATEGORY_MAX, C: CATEGORY_MAX, D: CATEGORY_MAX };
export type CatCount = { letter: string; owned: number; min: number; max: number };
export function categoryCounts(squad: BudgetLot[], groups: BudgetGroup[]): CatCount[] {
    return ['A', 'B', 'C', 'D'].map((letter) => ({
        letter,
        owned: squad.filter((l) => !isFemale(l) && letterOf(groups.find((g) => g.id === l.categoryId)?.name) === letter).length,
        min: CAT_MIN[letter] ?? 0,
        max: CAT_MAX[letter] ?? 0,
    }));
}

/** Male A–D counts, then women once across every category (separate from the category counts): the squad cards' composition row. */
export function compositionCounts(squad: BudgetLot[], groups: BudgetGroup[]): CatCount[] {
    return [...categoryCounts(squad, groups), { letter: 'Female', owned: squad.filter(isFemale).length, min: FEMALE_MIN, max: FEMALE_MAX }];
}
