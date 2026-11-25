import type { ReactNode } from 'react';
import type { LeaguePlayer, Level, Sport } from '@league/lib/lineup-rules';

const ABBR: Record<Level, string> = { Beginner: 'BEG', Intermediate: 'INT', Advanced: 'ADV' };
/** Short level labels used on compact player cards. */
export const levelAbbr = (level: Level) => ABBR[level];

/** Square player card: number + name at equal weight, abbreviated levels, gender tag and assignment chips. */
export function LeaguePlayerCard({ player, only, photo, expanded = false, showPhoto = true, foot, chips }: {
  player: LeaguePlayer; only?: Sport; photo?: string; expanded?: boolean; showPhoto?: boolean; foot?: ReactNode; chips?: ReactNode;
}) {
  const initials = player.name.split(/\s+/).slice(0, 2).map(word => word[0]?.toUpperCase() ?? '').join('');
  const female = player.gender === 'F';
  return <span className={`lx-card${expanded ? ' is-tile' : ''}`}>
    <span className={`lx-gender${female ? ' is-female' : ''}`} aria-label={female ? 'Female' : 'Male'}>{female ? 'F' : 'M'}</span>
    {expanded && showPhoto && <span className="lx-avatar" aria-hidden>{photo ? <img src={photo} alt="" /> : initials}</span>}
    <span className="lx-player-identity"><span className="lx-num">#{player.no}</span><span className="lx-name">{player.name}</span></span>
    <span className="lx-levels">
      {(!only || only === 'Padel') && player.padel && <span><small>PD</small><b>{levelAbbr(player.padel)}</b></span>}
      {(!only || only === 'Pickleball') && player.pickleball && <span><small>PB</small><b>{levelAbbr(player.pickleball)}</b></span>}
    </span>
    {chips && <span className="lx-chips">{chips}</span>}
    {foot && <span className="lx-foot">{foot}</span>}
  </span>;
}
