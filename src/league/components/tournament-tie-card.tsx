import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Button } from '@league/ui/button';
import { TeamLogo } from '@league/components/auction-ui';
import type { Team } from '@league/lib/auction';

/** Shared sports-scorecard hierarchy for public, team and organiser matchups. */
export function TournamentTieCard({ label, a, b, pointsA, pointsB, winsA, winsB, status, note, disabled = false, expanded, onClick, variant = 'default', hero = false }: {
  label: string; a: { name: string; team: Team | null; state?: ReactNode }; b: { name: string; team: Team | null; state?: ReactNode };
  pointsA: number; pointsB: number; winsA: number; winsB: number; status?: ReactNode; note?: ReactNode;
  disabled?: boolean; expanded?: boolean; onClick?: () => void;
  variant?: 'default' | 'public'; hero?: boolean;
}) {
  if (variant === 'public') {
    const lead = pointsA === pointsB ? 0 : pointsA > pointsB ? 1 : 2;
    const side = (x: typeof a, i: number) => <span className={`tn-public-result-side${lead && lead !== i + 1 ? ' is-trailing' : ''}`}><TeamLogo team={x.team} size={48} /><strong>{x.name}</strong><span className="tn-public-result-points"><b>{i === 0 ? winsA : winsB}</b> {(i === 0 ? winsA : winsB) === 1 ? 'match' : 'matches'} won</span></span>;
    const body = <>
      {status && <span className="tn-public-result-status">{status}</span>}
      <span className="tn-public-result-teams">{side(a, 0)}
        <span className="tn-public-result-score"><b>{pointsA}<i>–</i>{pointsB}</b><small>Points</small></span>
        {side(b, 1)}</span>
      {note && <small className="tn-public-result-note">{note}</small>}
      <span className="tn-public-result-foot"><span>{label}</span>{!disabled && !hero && <ChevronRight size={15} aria-hidden="true" />}</span>
    </>;
    return hero ? <div className="tn-tie-card tn-public-result-card is-hero">{body}</div> : <Button variant="ghost" className="tn-tie-card tn-scoring-tie tn-public-result-card" disabled={disabled} onClick={onClick}>{body}</Button>;
  }
  return <Button variant="ghost" className="tn-tie-card tn-scoring-tie tn-sport-card" disabled={disabled} aria-expanded={expanded} onClick={onClick}>
    <span className="tn-sport-top"><span>{label}</span><span className="tn-sport-tally"><small>Matches</small><b>{winsA}–{winsB}</b><ChevronRight size={17} className={expanded ? 'is-expanded' : undefined} aria-hidden="true" /></span></span>
    <span className="tn-sport-teams">{([a, b] as const).map((side, i) => <span className="tn-sport-side" key={i}>
      <span className="tn-sport-logo"><TeamLogo team={side.team} size={32} />{side.state && <span className="tn-sport-state">{side.state}</span>}</span><strong>{side.name}</strong><span className="tn-sport-score"><span className="tn-sport-points"><b>{i === 0 ? pointsA : pointsB}</b><small>pts</small></span></span>
    </span>)}</span>
    {(status || note) && <span className="tn-sport-foot">{status}{note && <small>{note}</small>}</span>}
  </Button>;
}