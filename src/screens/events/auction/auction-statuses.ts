import { Check, Ban, Gavel, Clock, ShieldCheck } from 'lucide-react';

export const statuses = {
    waiting: { text: 'Waiting', tone: 'neutral', Icon: Clock },
    live: { text: 'On block', tone: 'warning', Icon: Gavel },
    sold: { text: 'Sold', tone: 'success', Icon: Check },
    unsold: { text: 'Unsold', tone: 'danger', Icon: Ban },
    retained: { text: 'Retained', tone: 'info', Icon: ShieldCheck },
};
export type StatusKey = keyof typeof statuses;
export const statusKey = (l: { retained: boolean; status: AuctionLotStatus }): StatusKey =>
    l.retained ? 'retained' : (l.status.toLowerCase() as StatusKey);
