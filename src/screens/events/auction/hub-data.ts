import type { BidContext, BudgetTeam } from '../../../lib/auction-bid-budget';

/** Everything the Team Hub reads, from the team board. */
export type HubTeam = BudgetTeam & { logoUrl: string | null; sort: number };
export type HubData = BidContext & { teams: HubTeam[]; groups: ApiAuctionCategory[]; lots: ApiAuctionLot[] };

export const toHubData = (board: ApiAuctionBoardData): HubData => ({
    teams: board.teams,
    groups: board.categories,
    lots: board.lots,
    phase: board.state.phase,
    round: board.state.round ?? null,
    currentGroupId: board.state.currentCategoryId,
    currentId: board.state.currentLotId,
});

