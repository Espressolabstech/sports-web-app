/**
 * Pure client-side helpers for the auction screens — the server is the
 * source of truth for every validation rule (see sports-api's
 * auction.controller.ts); these mirror the same rules so the UI can
 * disable/warn before a request round-trip, not to replace server checks.
 */

export const MIN_SQUAD = 11;
export const MIN_WOMEN = 2;
export const MIN_PRICE_INR = 3000;
export const FALLBACK_BASE_PRICE_INR = 3000;
/** Every new team starts with this purse (rulebook: ₹62,500 of the ₹1,25,000 team licence). */
export const TEAM_PURSE_INR = 62500;

export function initials(name: string): string {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('');
}

export function rupees(amountInr: number): string {
    return `₹${Math.round(amountInr).toLocaleString('en-IN')}`;
}

type Phase = 'CATEGORIES' | 'REAUCTION';
type Status = 'WAITING' | 'LIVE' | 'SOLD' | 'UNSOLD';
type LotLike = { id: string; number?: number | null; status: Status; teamId: string | null; priceInr: number | null };
type CategoryLike = { id: string; name: string; basePriceInr: number; retentionMultiplier: number; sort: number };
type StateLike = { currentLotId: string | null; currentCategoryId: string | null; phase: Phase };
type TeamLike = { id: string; name: string; purseInr: number; remainingInr: number };

export function spentBy(teamId: string, lots: LotLike[]): number {
    return lots.filter((l) => l.status === 'SOLD' && l.teamId === teamId).reduce((sum, l) => sum + (l.priceInr ?? 0), 0);
}

/** Lots are always listed by draw number. */
export const byNumber = <T extends { id: string; number?: number | null }>(a: T, b: T) =>
    (a.number ?? Infinity) - (b.number ?? Infinity) || a.id.localeCompare(b.id);

export function waitingQueue<T extends LotLike & { categoryId: string | null }>(lots: T[], categoryId: string | null): T[] {
    return lots.filter((l) => l.status === 'WAITING' && l.categoryId === categoryId).sort(byNumber);
}

export function reauctionPool<T extends LotLike & { reauctioned: boolean }>(lots: T[]): T[] {
    return lots.filter((l) => l.status === 'UNSOLD' && !l.reauctioned).sort(byNumber);
}

/** The next player who could be drawn in the current phase, or undefined if nobody can be called right now. */
export function nextUp<T extends LotLike & { categoryId: string | null; reauctioned: boolean }>(lots: T[], state: StateLike): T | undefined {
    if (state.phase === 'REAUCTION') return reauctionPool(lots)[0];
    if (!state.currentCategoryId) return undefined;
    return waitingQueue(lots, state.currentCategoryId)[0];
}

/** Next category (by sort) that still has waiting players — used to suggest "Start Category B" once A empties. */
export function nextCategory<T extends LotLike & { categoryId: string | null }>(
    categories: CategoryLike[],
    lots: T[],
    currentCategoryId: string | null,
): CategoryLike | undefined {
    const sorted = [...categories].sort((a, b) => a.sort - b.sort);
    return sorted.find((c) => c.id !== currentCategoryId && waitingQueue(lots, c.id).length > 0);
}

export function saleError(priceInr: number, remainingInr: number, baseInr: number): string | null {
    if (!Number.isFinite(priceInr)) return 'Enter a sale price.';
    if (priceInr < baseInr) return `Price must be at least the base price of ${rupees(baseInr)}`;
    if (priceInr > remainingInr) return "Price is more than the team's remaining purse";
    return null;
}

export function purseError(newPurseInr: number, spentInr: number): string | null {
    if (!Number.isFinite(newPurseInr) || newPurseInr < 0) return 'Enter a valid purse';
    if (newPurseInr < spentInr) return 'Purse cannot be lower than what the team has already spent';
    return null;
}

/** Pre-auction retention price: the category's base price times its retention multiplier. */
export function retentionCost(lot: { effectiveBasePriceInr: number }, category: { retentionMultiplier: number } | undefined): number {
    return Math.round(lot.effectiveBasePriceInr * (category?.retentionMultiplier ?? 1.5));
}

/** Non-blocking warning only — never prevents a sale/retention. */
export function reserveWarning(team: { name: string; remainingInr: number; squadCount: number }, priceInr: number): string | null {
    const remainingAfter = team.remainingInr - priceInr;
    const slotsAfter = MIN_SQUAD - (team.squadCount + 1);
    if (slotsAfter <= 0) return null;
    const minNeeded = slotsAfter * MIN_PRICE_INR;
    if (remainingAfter < minNeeded) {
        return `After this sale ${team.name} has ${rupees(Math.max(0, remainingAfter))} left for ${slotsAfter} more player${slotsAfter === 1 ? '' : 's'} (needs ${rupees(minNeeded)} at ₹3,000 each)`;
    }
    return null;
}

export const KIND_LABELS: Record<string, string> = {
    put_up: 'Put up',
    sold: 'Sold',
    unsold: 'Unsold',
    undo: 'Sale undone',
    reset: 'Auction reset',
    retain: 'Player retained',
    unretain: 'Retention removed',
    purse: 'Purse changed',
    team_added: 'Team added',
    team_renamed: 'Team renamed',
    team_removed: 'Team removed',
    logo: 'Logo updated',
    lot_assign: 'Players moved',
    lot_start: 'Lot started',
    reauction_start: 'Re-auction started',
    sync_players: 'Synced players',
    setup: 'Auction set up',
    team_user_added: 'Team user added',
    team_user_updated: 'Team user updated',
    team_user_removed: 'Team user removed',
    retention_multiplier: 'Retention multiplier changed',
    levels: 'Skill levels saved',
    correction: 'Result corrected',
};

export function kindLabel(kind: string): string {
    return KIND_LABELS[kind] ?? kind;
}

// ── Skill levels, categories and retention (rulebook) ──────────────────────

/** Rulebook skill points: Beginner 1, Intermediate 2, Advanced 3. A missing level counts as Beginner and is flagged. */
const LEVEL_POINTS: Record<string, number> = { Beginner: 1, Intermediate: 2, Advanced: 3, Pro: 3 };
export const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced'] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

type LevelLot = { padelLevel: string | null; pickleballLevel: string | null; levelsConfirmed: boolean };

/** The player's levels: the organizer's saved levels win over the registration answers; a sport not played reads as Beginner. */
export function levelsOf(lot: LevelLot) {
    return { padel: lot.padelLevel ?? undefined, pickleball: lot.pickleballLevel ?? undefined, confirmed: lot.levelsConfirmed };
}

export function skillPoints(padelLevel: string | undefined, pickleballLevel: string | undefined) {
    const p = LEVEL_POINTS[padelLevel ?? ''];
    const q = LEVEL_POINTS[pickleballLevel ?? ''];
    return { points: (p ?? 1) + (q ?? 1), flagged: p == null || q == null };
}

/** Suggested category name from total points: 6 → A, 5 → B, 4 → C, 2–3 → D. */
export const categoryForPoints = (points: number) =>
    points >= 6 ? 'Category A' : points === 5 ? 'Category B' : points === 4 ? 'Category C' : 'Category D';

/** Base price of the category those points belong to. */
export const baseForPoints = (points: number) => (points >= 6 ? 6000 : points === 5 ? 5000 : points === 4 ? 4000 : 3000);

export function suggestCategory(lot: LevelLot) {
    const l = levelsOf(lot);
    const s = skillPoints(l.padel, l.pickleball);
    return { ...s, flagged: s.flagged && !l.confirmed, category: categoryForPoints(s.points) };
}

export const MAX_RETENTIONS = 2;
/** Category D is the base category, identified by its ₹3,000 base price so renaming/reordering can't break the rule. */
export const BASE_CATEGORY_INR = 3000;
const isBaseCategory = (lot: { categoryId: string | null } | undefined, categories: CategoryLike[]) =>
    categories.find((c) => c.id === lot?.categoryId)?.basePriceInr === BASE_CATEGORY_INR;

/** Mirrors the server rule: up to 2 retentions per team, at most one from outside Category D, in any order. */
export function retentionError(
    teamId: string,
    lot: { categoryId: string | null } | undefined,
    lots: (LotLike & { categoryId: string | null; retained: boolean })[],
    categories: CategoryLike[],
): string | null {
    const held = lots.filter((l) => l.retained && l.teamId === teamId);
    if (held.length >= MAX_RETENTIONS) return 'A team can retain at most 2 players';
    if (!isBaseCategory(lot, categories) && held.some((l) => !isBaseCategory(l, categories))) {
        return 'A team can retain only one player from outside Category D';
    }
    return null;
}

/** Skill management, including retained players, is strictly pre-auction. */
export function canEditPlayerSkills(lot: { status: Status; retained: boolean }, retentionOpen: boolean) {
    return retentionOpen && (lot.status === 'WAITING' || lot.retained);
}

/** Validate the replacement retention for a retained player's new levels, excluding the old purchase. */
export function retainedLevelEditError(
    lot: LotLike & { categoryId: string | null; retained: boolean },
    padel: string,
    pickleball: string,
    lots: (LotLike & { categoryId: string | null; retained: boolean })[],
    categories: (CategoryLike & { id: string })[],
    teams: TeamLike[],
): string | null {
    if (!lot.retained) return null;
    const category = categories.find((c) => c.basePriceInr === baseForPoints(skillPoints(padel, pickleball).points));
    if (!category) return 'Category for these skill points was not found';
    const team = teams.find((t) => t.id === lot.teamId);
    if (!team) return 'Retaining team not found';
    const others = lots.filter((l) => l.id !== lot.id);
    const error = retentionError(team.id, { categoryId: category.id }, others, categories);
    if (error) return error;
    const remaining = team.purseInr - spentBy(team.id, others);
    return Math.round(category.basePriceInr * category.retentionMultiplier) > remaining
        ? "Updated retention cost is more than the team's remaining purse"
        : null;
}

// ── Auction Hub: filters, calling, corrections ─────────────────────────────

export type GridFilters = { category: string; status: string; gender: string; search: string };
type GridLot = LotLike & {
    categoryId: string | null;
    gender?: string | null;
    name: string;
    retained: boolean;
    reauctioned: boolean;
    padelLevel?: string | null;
    pickleballLevel?: string | null;
};

export function filterAuctionLots<T extends GridLot>(lots: T[], f: GridFilters): T[] {
    const needle = f.search.trim().toLowerCase();
    return lots
        .filter(
            (l) =>
                (f.category === 'all' || (f.category === 'none' ? !l.categoryId : l.categoryId === f.category)) &&
                (f.status === 'all' ||
                    (f.status === 'auto'
                        ? l.padelLevel == null || l.pickleballLevel == null
                        : f.status === 'retained'
                          ? l.retained
                          : l.status === f.status.toUpperCase() && !l.retained)) &&
                (f.gender === 'all' || l.gender === f.gender) &&
                (!needle || `${l.number ?? ''} ${l.name}`.toLowerCase().includes(needle)),
        )
        .sort(byNumber);
}

/** Only a player in the open category (or an unsold player in the re-auction) can be drawn, and only while nobody is on the block. */
export function canCallPlayer(
    lot: { status: Status; categoryId: string | null; retained: boolean; reauctioned: boolean },
    state: StateLike,
) {
    return (
        !state.currentLotId &&
        !lot.retained &&
        (state.phase === 'CATEGORIES'
            ? !!state.currentCategoryId && lot.categoryId === state.currentCategoryId && lot.status === 'WAITING'
            : lot.status === 'UNSOLD' && !lot.reauctioned)
    );
}

export function correctionError(
    lot: LotLike & { effectiveBasePriceInr: number },
    team: TeamLike | undefined,
    priceInr: number,
    lots: LotLike[],
): string | null {
    if (!team) return 'Choose a buying team';
    return saleError(priceInr, team.purseInr - spentBy(team.id, lots.filter((l) => l.id !== lot.id)), lot.effectiveBasePriceInr);
}

// ── Team Hub statistics ────────────────────────────────────────────────────

export function categoryAverages<T extends LotLike & { categoryId: string | null; retained: boolean }>(
    categories: CategoryLike[],
    lots: T[],
    teamId: string,
) {
    return categories.map((c) => {
        const sales = lots.filter((l) => l.status === 'SOLD' && !l.retained && l.categoryId === c.id);
        const own = sales.filter((l) => l.teamId === teamId);
        const avg = (ls: T[]) => (ls.length ? Math.round(ls.reduce((n, l) => n + (l.priceInr ?? 0), 0) / ls.length) : null);
        return { name: c.name, own: avg(own), market: avg(sales), count: own.length };
    });
}

export function spendingTrend<T extends LotLike & { retained: boolean; soldAt: string | null; name: string }>(lots: T[], teamId: string) {
    let total = lots
        .filter((l) => l.status === 'SOLD' && l.retained && l.teamId === teamId)
        .reduce((n, l) => n + (l.priceInr ?? 0), 0);
    const points = [{ sale: 0, total, label: 'Retention' }];
    lots.filter((l) => l.status === 'SOLD' && !l.retained && l.teamId === teamId)
        .sort((a, b) => (a.soldAt ?? '').localeCompare(b.soldAt ?? ''))
        .forEach((l, i) => {
            total += l.priceInr ?? 0;
            points.push({ sale: i + 1, total, label: l.name });
        });
    return points;
}

export function squadOf<T extends LotLike & { gender?: string | null }>(teamId: string, lots: T[]) {
    const squad = lots.filter((l) => l.status === 'SOLD' && l.teamId === teamId);
    const women = squad.filter((l) => l.gender === 'Female').length;
    return { players: squad.length, women, shortPlayers: squad.length < MIN_SQUAD, shortWomen: women < MIN_WOMEN };
}
