import { MIN_SQUAD, spentBy } from './auction';
import { FEMALE_MIN, isFemale, type BudgetGroup, type BudgetLot, type BudgetTeam } from './auction-bid-budget';

/** Auction buys only: retentions are excluded from every auction statistic. */
export const auctionSales = (lots: BudgetLot[]) => lots.filter((l) => l.status === 'SOLD' && !l.retained && l.priceInr !== null);
export const timesBase = (price: number, base: number) => (base ? price / base : 1);
export const formatTimes = (x: number) => (Math.abs(x - 1) < 0.005 ? 'at base' : `${x.toFixed(2)}×`);

export function auctionPool(teams: BudgetTeam[], lots: BudgetLot[]) {
    const left = lots.filter((l) => !l.retained && !!l.categoryId && (l.status === 'WAITING' || l.status === 'LIVE' || (l.status === 'UNSOLD' && !l.reauctioned)));
    let slots = 0;
    let femaleNeeded = 0;
    for (const t of teams) {
        const squad = lots.filter((l) => l.status === 'SOLD' && l.teamId === t.id);
        slots += Math.max(0, MIN_SQUAD - squad.length);
        femaleNeeded += Math.max(0, FEMALE_MIN - squad.filter(isFemale).length);
    }
    return { playersLeft: left.length, slotsToFill: slots, femaleLeft: left.filter(isFemale).length, femaleNeeded };
}

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

export function auctionStats(groups: BudgetGroup[], lots: BudgetLot[], teams: BudgetTeam[]) {
    const sales = auctionSales(lots);
    const spent = sales.reduce((s, l) => s + (l.priceInr ?? 0), 0);
    const unsold = lots.filter((l) => l.status === 'UNSOLD' && !l.reauctioned).length;
    const ordered = groups.slice().sort((a, b) => a.sort - b.sort);
    const categories = ordered.map((g) => {
        const s = sales.filter((l) => l.categoryId === g.id);
        const avg = s.length ? s.reduce((n, l) => n + (l.priceInr ?? 0), 0) / s.length : null;
        return {
            group: g, sales: s, avg, times: avg === null ? null : timesBase(avg, g.basePriceInr),
            unsold: lots.filter((l) => l.categoryId === g.id && l.status === 'UNSOLD').length,
            waiting: lots.filter((l) => l.categoryId === g.id && l.status === 'WAITING').length,
        };
    });
    const byGender = (want: boolean) => {
        const s = sales.filter((l) => isFemale(l) === want);
        return {
            count: s.length,
            avg: s.length ? s.reduce((n, l) => n + (l.priceInr ?? 0), 0) / s.length : 0,
            times: s.length ? s.reduce((n, l) => n + timesBase(l.priceInr ?? 0, l.effectiveBasePriceInr), 0) / s.length : 0,
        };
    };
    const top = (list: BudgetLot[]) => list.slice().sort((a, b) => (b.priceInr ?? 0) - (a.priceInr ?? 0) || (a.soldAt ?? '').localeCompare(b.soldAt ?? ''))[0];
    const highest = categories.find((c) => c.sales.length); // categories run A (highest) → D
    // Steal: highest category with sales, closest to its base; earliest sale wins ties.
    const steal = highest?.sales.slice().sort((a, b) => (a.priceInr ?? 0) - (b.priceInr ?? 0) || (a.soldAt ?? '').localeCompare(b.soldAt ?? ''))[0];
    const row = (l: BudgetLot | undefined) =>
        l && { lot: l, team: teams.find((t) => t.id === l.teamId), group: groups.find((g) => g.id === l.categoryId), times: timesBase(l.priceInr ?? 0, l.effectiveBasePriceInr) };
    return {
        sold: sales.length, spent, average: sales.length ? Math.round(spent / sales.length) : 0, unsold, categories,
        female: byGender(true), male: byGender(false),
        highlights: sales.length ? { top: row(top(sales)), topFemale: row(top(sales.filter(isFemale))), steal: row(steal) } : null,
    };
}
