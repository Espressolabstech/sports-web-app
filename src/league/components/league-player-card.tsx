import type { ReactNode } from 'react';
import type { LeaguePlayer, Sport } from '@league/lib/lineup-rules';

/** Shared auction-style identity and labelled fields for team player cards. */
export function LeaguePlayerCard({ player, only, photo, expanded = false, foot }: {
  player: LeaguePlayer; only?: Sport; photo?: string; expanded?: boolean; foot?: ReactNode;
}) {
  const initials = player.name.split(/\s+/).slice(0, 2).map(word => word[0]?.toUpperCase() ?? '').join('');
  return <>
    <span className={`lx-player-heading${expanded ? ' is-expanded' : ''}`}>
      {expanded && <span className="lx-avatar" aria-hidden>{photo ? <img src={photo} alt="" /> : initials}</span>}
      <span className="lx-player-identity"><strong className="lx-num">{player.no}</strong><span className="lx-name">{player.name}</span></span>
    </span>
    <span className={`lx-player-fields${only ? ' is-single' : ''}`}>
      {(!only || only === 'Padel') && player.padel && <span><small>Padel</small><b>{player.padel}</b></span>}
      {(!only || only === 'Pickleball') && player.pickleball && <span><small>Pickleball</small><b>{player.pickleball}</b></span>}
      <span><small>Gender</small><b>{player.gender === 'F' ? 'Female' : 'Male'}</b></span>
    </span>
    {foot && <span className="lx-foot">{foot}</span>}
  </>;
}