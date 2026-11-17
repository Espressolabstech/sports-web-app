import { PlayerPhoto } from '../../../components/PlayerPhoto';
import { initials, rupees, SKILL_LEVELS, skillPoints } from '../../../lib/auction';

/** The player on the block: identity, one combined sporting summary, and the base price on its own line. */
export function AuctionLivePlayer({ lot, categoryName, reauction }: { lot: ApiAuctionLot; categoryName?: string; reauction: boolean }) {
    const padel = lot.padelLevel ?? SKILL_LEVELS[0];
    const pickleball = lot.pickleballLevel ?? SKILL_LEVELS[0];
    // One sport's points on its own (skillPoints counts the other sport as Beginner = 1).
    const padelPoints = skillPoints(padel, undefined).points - 1;
    const pickleballPoints = skillPoints(pickleball, undefined).points - 1;
    return (
        <section className="auction-stage auction-player-enter auction-live-player" key={lot.id} aria-label={`${lot.name} sporting levels`} aria-live="polite">
            <div className="auction-live-identity">
                <div className="auction-stage-avatar">
                    <PlayerPhoto src={lot.photoUrl} name={lot.name} fallback={initials(lot.name)} />
                </div>
                <div className="auction-stage-info">
                    <span className="auction-stage-id">
                        {String(lot.number ?? 0).padStart(3, '0')}
                        {reauction ? ' · Re-auction round' : ''}
                    </span>
                    <h2>{lot.name}</h2>
                </div>
            </div>
            <div className="auction-live-skills">
                <dl>
                    <div>
                        <dt>Padel</dt>
                        <dd>
                            {padel}
                            <span>
                                {padelPoints} {padelPoints === 1 ? 'pt' : 'pts'}
                            </span>
                        </dd>
                    </div>
                    <div>
                        <dt>Pickleball</dt>
                        <dd>
                            {pickleball}
                            <span>
                                {pickleballPoints} {pickleballPoints === 1 ? 'pt' : 'pts'}
                            </span>
                        </dd>
                    </div>
                </dl>
                <div className="auction-live-category">
                    <strong>{categoryName ?? 'Unassigned'}</strong>
                    <span>{padelPoints + pickleballPoints} total pts</span>
                </div>
            </div>
            <div className="auction-base">
                <span>Base price</span>
                <strong>{rupees(lot.effectiveBasePriceInr)}</strong>
            </div>
        </section>
    );
}
