/**
 * Pure client-side helpers for the auction console — the server is the
 * source of truth for every validation rule (see sports-api's
 * auction.controller.ts); these mirror the same rules so the UI can
 * disable/warn before a request round-trip, not to replace server checks.
 */

export const MIN_SQUAD = 11;
export const MIN_WOMEN = 2;
export const FALLBACK_BASE_PRICE_INR = 3000;

export function initials(name: string): string {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('');
}

export function rupees(amountInr: number): string {
    return `₹${Math.round(amountInr).toLocaleString('en-IN')}`;
}

export function spentBy(teamId: string, lots: { status: AuctionLotStatus; teamId: string | null; priceInr: number | null }[]): number {
    return lots.filter((l) => l.status === 'SOLD' && l.teamId === teamId).reduce((sum, l) => sum + (l.priceInr ?? 0), 0);
}

export function waitingQueue(lots: ApiAuctionLot[], categoryId: string | null): ApiAuctionLot[] {
    return lots
        .filter((l) => l.status === 'WAITING' && l.categoryId === categoryId)
        .sort((a, b) => a.queueOrder - b.queueOrder || a.id.localeCompare(b.id));
}

export function reauctionPool(lots: ApiAuctionLot[]): ApiAuctionLot[] {
    return lots
        .filter((l) => l.status === 'UNSOLD' && !l.reauctioned)
        .sort((a, b) => a.queueOrder - b.queueOrder || a.id.localeCompare(b.id));
}

/** The single next-callable lot, or undefined if nothing can be called right now. */
export function nextUp(lots: ApiAuctionLot[], state: ApiAuctionState): ApiAuctionLot | undefined {
    if (state.phase === 'REAUCTION') return reauctionPool(lots)[0];
    if (!state.currentCategoryId) return undefined;
    return waitingQueue(lots, state.currentCategoryId)[0];
}

/** Next category (by sort) that still has waiting players — used to suggest "Start Category B" once A empties. */
export function nextCategory(
    categories: ApiAuctionCategory[],
    lots: ApiAuctionLot[],
    currentCategoryId: string | null,
): ApiAuctionCategory | undefined {
    const sorted = [...categories].sort((a, b) => a.sort - b.sort);
    return sorted.find((c) => c.id !== currentCategoryId && waitingQueue(lots, c.id).length > 0);
}

export function saleError(priceInr: number, remainingInr: number, baseInr: number): string | null {
    if (!Number.isFinite(priceInr)) return 'Enter a sale price.';
    if (priceInr < baseInr) return `Sale price must be at least ${rupees(baseInr)}.`;
    if (priceInr > remainingInr) return "This exceeds the team's remaining purse.";
    return null;
}

export function purseError(newPurseInr: number, spentInr: number): string | null {
    if (!Number.isFinite(newPurseInr) || newPurseInr < 0) return 'Enter a valid purse amount.';
    if (newPurseInr < spentInr) return 'Purse cannot be set below what this team has already spent.';
    return null;
}

export function retentionCost(lot: ApiAuctionLot, category: ApiAuctionCategory | undefined): number {
    const multiplier = category?.retentionMultiplier ?? 1.5;
    return Math.round(lot.effectiveBasePriceInr * multiplier);
}

/** Non-blocking warning only — never prevents a sale/retention. */
export function reserveWarning(team: ApiAuctionTeam, priceInr: number): string | null {
    const remainingAfter = team.remainingInr - priceInr;
    const slotsAfter = MIN_SQUAD - (team.squadCount + 1);
    if (slotsAfter <= 0) return null;
    const minNeeded = slotsAfter * FALLBACK_BASE_PRICE_INR;
    if (remainingAfter < minNeeded) {
        return `${team.name} may not have enough purse left to reach ${MIN_SQUAD} players.`;
    }
    return null;
}

export const KIND_LABELS: Record<string, string> = {
    put_up: 'Called up',
    sold: 'Sold',
    unsold: 'Marked unsold',
    undo: 'Undid last sale',
    reset: 'Reset auction',
    retain: 'Retained',
    unretain: 'Removed retention',
    purse: 'Set purse',
    team_added: 'Added team',
    team_renamed: 'Renamed team',
    team_removed: 'Removed team',
    logo: 'Updated logo',
    lot_assign: 'Assigned to category',
    player_base: 'Set custom base price',
    lot_start: 'Started category',
    reauction_start: 'Started re-auction',
    sync_players: 'Synced players',
    setup: 'Auction set up',
    team_user_added: 'Team user added',
    team_user_updated: 'Team user updated',
    team_user_removed: 'Team user removed',
    retention_multiplier: 'Retention multiplier changed',
};

export function kindLabel(kind: string): string {
    return KIND_LABELS[kind] ?? kind;
}
