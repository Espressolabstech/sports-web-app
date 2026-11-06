// Pure helpers for the public auction view (see screens/events/auction/AuctionPublic.tsx).

/** The latest auction sale by its original sale time. Retentions never count; corrections keep the original time. */
export const justSold = (s: ApiAuctionPublicView) =>
    s.lots.filter((l) => l.status === 'SOLD' && !l.retained && !l.corrected && l.soldAt).sort((a, b) => (b.soldAt ?? '').localeCompare(a.soldAt ?? ''))[0];

/** A team's squad in slot order: retained first, then purchase order. */
export const squadSlots = (s: ApiAuctionPublicView, teamId: string) =>
    s.lots
        .filter((l) => l.status === 'SOLD' && l.team === teamId)
        .sort((a, b) => Number(b.retained) - Number(a.retained) || (a.soldAt ?? '').localeCompare(b.soldAt ?? ''));
