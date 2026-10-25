import { rupees } from '../../../lib/auction';
import courtCollectiveLogo from '../../../assets/court-collective-logo.png';
import { TeamLogo } from './AuctionShell';

const CourtMotion = () => (
    <svg className="auction-court-motion" viewBox="0 0 1000 480" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <g>
            <rect x="110" y="50" width="780" height="380" rx="3" />
            <path d="M500 50V430 M110 240H890 M250 50V430 M750 50V430" />
            <rect x="250" y="130" width="500" height="220" />
        </g>
        <path className="auction-court-flow" d="M-100 380 C180 60 350 470 540 190 S860 50 1100 250" />
        <path className="auction-court-flow second" d="M-100 380 C180 60 350 470 540 190 S860 50 1100 250" />
    </svg>
);

export function AuctionLotBreak({
    done,
    upcoming,
    sold,
    total,
}: {
    done?: string;
    upcoming?: string;
    sold: number;
    total: number;
}) {
    return (
        <section className="auction-intermission" aria-live="polite">
            <CourtMotion />
            <div className="auction-intermission-content">
                <img src={courtCollectiveLogo} alt="The Court Collective" width={250} height={88} />
                <p className="section-kicker">{done ? `${done.toUpperCase()} COMPLETE` : 'PLAYER AUCTION · 2026'}</p>
                <h2>
                    {upcoming ? (
                        <>
                            {upcoming.toUpperCase()}
                            <br />
                            <span style={{ color: 'var(--primary)' }}>IS NEXT.</span>
                        </>
                    ) : (
                        'THAT’S A WRAP.'
                    )}
                </h2>
                <span className="auction-waiting-status">
                    <i /> {upcoming ? 'Short break' : 'Auction complete'}
                </span>
            </div>
            <div className="auction-intermission-bottom">
                <span>
                    {sold} / {total} PLAYERS SOLD
                </span>
            </div>
        </section>
    );
}

export function AuctionWaiting({
    sold,
    total,
    label,
}: {
    sold: number;
    total: number;
    label?: string;
}) {
    const complete = sold === total && total > 0;
    return (
        <section className="auction-intermission" aria-live="polite">
            <CourtMotion />
            <div className="auction-intermission-content">
                <img src={courtCollectiveLogo} alt="The Court Collective" width={250} height={88} />
                <p className="section-kicker">{label ? label.toUpperCase() : 'PLAYER AUCTION · 2026'}</p>
                <h2>{complete ? 'THAT’S A WRAP.' : 'THE NEXT CHAPTER AWAITS.'}</h2>
                <span className="auction-waiting-status">
                    <i /> {complete ? 'Auction complete' : 'Between players'}
                </span>
            </div>
            <div className="auction-intermission-bottom">
                <span>
                    {sold} / {total} PLAYERS SOLD
                </span>
            </div>
        </section>
    );
}

export function AuctionSold({ lot, teamName, teamLogoUrl }: { lot: ApiAuctionLot; teamName?: string; teamLogoUrl?: string | null }) {
    return (
        <section className="auction-sold-moment" aria-live="polite" role="status">
            <div className="auction-sold-content">
                <p className="section-kicker">A NEW TEAM. A NEW CHAPTER.</p>
                <h2>
                    SOLD<span>.</span>
                </h2>
                <h3>{lot.name}</h3>
                <div className="auction-sold-team">
                    <TeamLogo name={teamName ?? ''} logoUrl={teamLogoUrl ?? null} size={46} />
                    <span>{teamName}</span>
                </div>
                <strong className="auction-sold-price">{rupees(lot.priceInr ?? 0)}</strong>
            </div>
            <span className="auction-sold-code">THE COURT COLLECTIVE 2026</span>
        </section>
    );
}
