import { Dialog, DialogDescription, DialogHeader, DialogTitle, SheetContent } from '../../../components/pp-ui';
import { PlayerPhoto } from '../../../components/PlayerPhoto';
import { initials, rupees, skillPoints } from '../../../lib/auction';
import { TeamLogo } from './AuctionShell';
import { statuses, statusKey } from './auction-statuses';

/** One sport's points on its own (skillPoints counts the other sport as Beginner = 1). */
const pointsOf = (level: string | null | undefined) => (level ? skillPoints(level, undefined).points - 1 : null);
const pts = (n: number) => `${n} ${n === 1 ? 'pt' : 'pts'}`;

/** A tapped player on the public Squads link: photo, levels, category and where they went. */
export function AuctionPlayerCard({
    board,
    lotId,
    card,
    onClose,
}: {
    board: ApiAuctionBoardData;
    lotId: string | null;
    card: ApiAuctionPlayerCard | undefined;
    onClose: () => void;
}) {
    const lot = board.lots.find((l) => l.id === lotId);
    return (
        <Dialog open={!!lot} onOpenChange={(o) => !o && onClose()}>
            <SheetContent className="hub-sheet">{lot && <PlayerDetail board={board} lot={lot} card={card} />}</SheetContent>
        </Dialog>
    );
}

function PlayerDetail({ board, lot, card }: { board: ApiAuctionBoardData; lot: ApiAuctionLot; card: ApiAuctionPlayerCard | undefined }) {
    const s = statuses[statusKey(lot)];
    const no = String(lot.number ?? 0).padStart(3, '0');
    const category = board.categories.find((g) => g.id === lot.categoryId)?.name ?? 'Unassigned';
    const team = lot.status === 'SOLD' ? board.teams.find((t) => t.id === lot.teamId) : undefined;
    const female = (card?.gender ?? lot.gender) === 'Female';
    const padel = card?.padelLevel ?? null;
    const pickleball = card?.pickleballLevel ?? null;
    const padelPts = pointsOf(padel);
    const pickleballPts = pointsOf(pickleball);
    const total = padelPts !== null && pickleballPts !== null ? padelPts + pickleballPts : null;
    return (
        <div className="hub-detail">
            <div className="hub-player-photo">
                <PlayerPhoto src={card?.photoUrl} name={lot.name} fallback={initials(lot.name)} />
            </div>
            <DialogHeader className="hub-player-head">
                <span className="hub-label">Player {no}</span>
                <DialogTitle>{lot.name}</DialogTitle>
                <DialogDescription asChild>
                    <div className="hub-player-tags">
                        {lot.status !== 'WAITING' && (
                            <span className={`pp-status pp-status-${s.tone}`}>
                                <s.Icon size={12} aria-hidden />
                                {s.text}
                            </span>
                        )}
                        <span className="hub-muted">
                            {category} · {female ? <span className="pp-female-text">Female</span> : 'Male'}
                        </span>
                    </div>
                </DialogDescription>
            </DialogHeader>

            <div>
                <span className="hub-label">{lot.status === 'SOLD' ? (lot.retained ? 'Retained for' : 'Sold for') : 'Base price'}</span>
                <strong className="hub-big">{rupees(lot.status === 'SOLD' ? (lot.priceInr ?? 0) : lot.effectiveBasePriceInr)}</strong>
                {team && (
                    <p className="hub-player-team">
                        <TeamLogo name={team.name} logoUrl={team.logoUrl} size={24} />
                        {team.name}
                    </p>
                )}
            </div>

            <div>
                <div className="hub-player-levels-head">
                    <span className="hub-label">Levels{total !== null && ` · ${pts(total)}`}</span>
                    {card && (padel || pickleball) && (
                        <span className={`pp-status pp-status-${card.levelsConfirmed ? 'success' : 'neutral'}`}>
                            {card.levelsConfirmed ? 'Host rated' : 'Self-rated'}
                        </span>
                    )}
                </div>
                <dl className="hub-player-levels">
                    <div>
                        <dt>Padel</dt>
                        <dd>{padel ?? 'Not played'}</dd>
                        {padelPts !== null && <small className="hub-muted">{pts(padelPts)}</small>}
                    </div>
                    <div>
                        <dt>Pickleball</dt>
                        <dd>{pickleball ?? 'Not played'}</dd>
                        {pickleballPts !== null && <small className="hub-muted">{pts(pickleballPts)}</small>}
                    </div>
                </dl>
            </div>

            {!!card?.sports.length && (
                <div>
                    <span className="hub-label">Plays</span>
                    <p className="mt-1">{card.sports.join(' · ')}</p>
                </div>
            )}
            {card?.achievements && (
                <div>
                    <span className="hub-label">Achievements</span>
                    <p className="hub-player-about">{card.achievements}</p>
                </div>
            )}
        </div>
    );
}
