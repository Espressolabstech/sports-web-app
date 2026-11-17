import { MIN_SQUAD, spentBy } from './auction';
import { FEMALE_MIN, isFemale, type BudgetGroup, type BudgetLot, type BudgetTeam } from './auction-bid-budget';

/** Auction buys only: retentions are excluded from every auction statistic. */
export const auctionSales = (lots: BudgetLot[]) => lots.filter((l) => l.status === 'SOLD' && !l.retained && l.priceInr !== null);
export const timesBase = (price: number, base: number) => (base ? price / base : 1);
export const formatTimes = (x: number) => (Math.abs(x - 1) < 0.005 ? 'at base' : `${x.toFixed(2)}×`);

export function teamStats(team: BudgetTeam, lots: BudgetLot[]) {
    const buys = auctionSales(lots).filter((l) => l.teamId === team.id);
    const all = lots.filter((l) => l.status === 'SOLD' && l.teamId === team.id);
    const left = team.purseInr - spentBy(team.id, lots);
    const slots = Math.max(0, MIN_SQUAD - all.length);
    return {
        avgBuy: buys.length ? Math.round(buys.reduce((s, l) => s + (l.priceInr ?? 0), 0) / buys.length) : null,
        topBuy: buys.length ? Math.max(...buys.map((l) => l.priceInr ?? 0)) : null,
        perSlot: slots ? Math.round(left / slots) : null,
    };
}

export type CategoryFact = {
    group: BudgetGroup;
    sold: number;
    total: number;
    avg: number | null;
    times: number | null;
    femaleTotal: number;
    femaleAvg: number | null;
    top: { name: string; price: number } | null;
    live: boolean;
    started: boolean;
};

/** Compact fact sheet for the Live Auction page. Retained players are excluded from every figure except squad needs. */
export function auctionFacts(groups: BudgetGroup[], lots: BudgetLot[], teams: BudgetTeam[], currentGroupId: string | null = null, phase = 'CATEGORIES') {
    const pool = lots.filter((l) => !l.retained);
    const sales = auctionSales(lots);
    const spent = sales.reduce((s, l) => s + (l.priceInr ?? 0), 0);
    const left = pool.filter((l) => l.status === 'WAITING' || l.status === 'LIVE' || (l.status === 'UNSOLD' && !l.reauctioned));
    let needed = 0;
    let femaleNeeded = 0;
    for (const t of teams) {
        const squad = lots.filter((l) => l.status === 'SOLD' && l.teamId === t.id);
        needed += Math.max(0, MIN_SQUAD - squad.length);
        femaleNeeded += Math.max(0, FEMALE_MIN - squad.filter(isFemale).length);
    }
    const avgOf = (ls: BudgetLot[]) => (ls.length ? Math.round(ls.reduce((n, l) => n + (l.priceInr ?? 0), 0) / ls.length) : null);
    const categories: CategoryFact[] = groups
        .slice()
        .sort((a, b) => a.sort - b.sort)
        .map((g) => {
            const all = pool.filter((l) => l.categoryId === g.id);
            const s = sales.filter((l) => l.categoryId === g.id);
            const avg = avgOf(s);
            const best = s.slice().sort((a, b) => (b.priceInr ?? 0) - (a.priceInr ?? 0) || (a.soldAt ?? '').localeCompare(b.soldAt ?? ''))[0];
            const live = phase === 'CATEGORIES' && currentGroupId === g.id;
            return {
                group: g, sold: s.length, total: all.length, avg, times: avg === null ? null : timesBase(avg, g.basePriceInr),
                femaleTotal: all.filter(isFemale).length, femaleAvg: avgOf(s.filter(isFemale)),
                top: best ? { name: best.name ?? '', price: best.priceInr ?? 0 } : null,
                live, started: live || all.some((l) => l.status === 'SOLD' || l.status === 'UNSOLD'),
            };
        });
    return {
        sold: sales.length, lots: pool.length, unsold: pool.filter((l) => l.status === 'UNSOLD' && !l.reauctioned).length,
        spent, average: sales.length ? Math.round(spent / sales.length) : null,
        playersLeft: left.length, needed, femaleLeft: left.filter(isFemale).length, femaleNeeded, categories,
    };
}
