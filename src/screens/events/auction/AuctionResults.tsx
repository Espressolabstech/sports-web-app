import { useParams } from 'react-router-dom';
import AuctionTeamLoginGate from '../../../components/events/AuctionTeamLoginGate';
import { useAuctionTeamSession, type AuctionTeamSession } from '../../../lib/auction-team-session';
import { useTeamBoard } from '../../../lib/auction-team-board';
import { AnimatedLoader } from '../../../components/AnimatedLoader';
import AuctionShell from './AuctionShell';
import { HubStats, HubTiles, HubTop } from './AuctionTeamHub';
import { toHubData } from './hub-data';

function LiveAuctionInner({ slug, session, logout }: { slug: string; session: AuctionTeamSession; logout: () => void }) {
    const { data, isLoading } = useTeamBoard(slug, session, logout);
    const board = data?.data;
    if (isLoading || !board) {
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

/** Live Auction: the player on the block, every team's purse and max bid, and the auction's numbers. Team users only. */
export default function AuctionResults({ slugOverride }: { slugOverride?: string }) {
    const params = useParams();
    const slug = slugOverride ?? params.slug!;
    const { session, login, logout } = useAuctionTeamSession(slug);
    return (
        <AuctionTeamLoginGate slug={slug} session={session} onLogin={login} title="Live Auction login">
            {session && <LiveAuctionInner slug={slug} session={session} logout={logout} />}
        </AuctionTeamLoginGate>
    );
}
