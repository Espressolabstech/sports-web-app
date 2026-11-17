import { useParams } from 'react-router-dom';
import { usePublicBoard } from '../../../lib/auction-team-board';
import { AnimatedLoader } from '../../../components/AnimatedLoader';
import AuctionShell from './AuctionShell';
import { HubStats, HubTiles, HubTop } from './AuctionTeamHub';
import { toHubData } from './hub-data';

/** Live Auction: the player on the block, every team's purse and max bid, and the auction's numbers. Public, no login. */
export default function AuctionResults({ slugOverride }: { slugOverride?: string }) {
    const params = useParams();
    const slug = slugOverride ?? params.slug!;
    const { data: board } = usePublicBoard(slug);
    if (!board) {
        return (
            <AuctionShell slug={slug} title="LIVE AUCTION">
                <div className="flex justify-center py-16">
                    <AnimatedLoader />
                </div>
            </AuctionShell>
        );
    }
    const a = toHubData(board);
    return (
        <AuctionShell slug={slug} isLive={!!board.state.currentLotId} title="LIVE AUCTION">
            <div className="hub">
                <div className="hub-workspace">
                    <HubTop a={a} />
                    <div className="hub-teams-workspace">
                        <HubTiles a={a} />
                    </div>
                </div>
                <HubStats a={a} />
            </div>
        </AuctionShell>
    );
}
