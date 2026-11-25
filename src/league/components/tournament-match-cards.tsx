import { Check, ChevronRight } from 'lucide-react';
import { Button } from '@league/ui/button';
import { useLeague, lineupOf, part1Of } from '@league/lib/league-store';
import { SPOTS } from '@league/lib/lineup-rules';
import { squadFor } from '@league/lib/league-squads';
import { DISCIPLINES, teamCode, tieScore, type Discipline, type Tie } from '@league/lib/tournament';
import type { TournamentData } from '@league/hooks/use-tournament';

/** Identical team-aligned match details for scorer and read-only Results. */
export function TournamentMatchCards({ d, tie, onScore, scorable = 'all' }: { d: TournamentData; tie: Tie; onScore?: ((disc: Discipline) => void) | undefined; scorable?: 'all' | 'open' | 'done' }) {
  const league = useLeague();
  const ms = d.matches.filter(m => m.tie_id === tie.id);
  const decided = tie.round === 'ko' && tieScore(ms).winner != null;
  const teamName = (slot: number | null) => slot == null ? 'TBD' : d.slots[slot]?.name ?? `Slot ${slot}`;
  const side = (slot: number | null, disc: Discipline, cls: string, won: boolean) => {
    const rec = slot == null ? undefined : lineupOf(league, tie.id, slot);
    const squad = slot == null ? [] : squadFor(teamCode(slot));
    const badge = won && <span className="tn-match-won" role="img" aria-label="Won this match" />;
    return <span className={`${cls}${won ? ' tn-side-won' : ''}`}><small>{cls === 'tn-side-b' ? <>{teamName(slot)} {badge}</> : <>{badge} {teamName(slot)}</>}</small>
      {SPOTS.filter(x => x.discipline === disc.key).map(spot => <span key={spot.id}>
        {squad.find(p => p.id === rec?.spots[spot.id])?.name ?? '—'}
        {rec?.replacedSpots?.includes(spot.id) && <span className="pp-status pp-status-danger">Changed after lock</span>}
      </span>)}
    </span>;
  };
  return <div className="tn-match-groups">{(part1Of(league, tie.id) === 'Padel' ? ['Padel', 'Pickleball'] as const : ['Pickleball', 'Padel'] as const).map(sport => <section key={sport} className="tn-matches">
    <h2>{sport}</h2>
    {DISCIPLINES.filter(x => x.sport === sport).map(disc => {
      const m = ms.find(x => x.discipline === disc.key);
      const exceptional = m?.done && (m.outcome === 'wo' || m.outcome === 'ret');
      const score = exceptional ? (m.outcome === 'ret' ? 'Retirement' : 'Walkover') : m && (onScore || m.done || m.score_a || m.score_b) ? `${m.score_a}–${m.score_b}` : '—';
      const wonA = !!(m?.done && m.winner === 'a');
      const wonB = !!(m?.done && m.winner === 'b');
      const content = <>
        <span className="tn-match-title"><b>{SPOTS.find(x => x.discipline === disc.key)?.code}</b><strong>{SPOTS.find(x => x.discipline === disc.key)?.match ?? disc.name}</strong><span className="pp-status pp-status-neutral">{disc.points} pts</span></span>
        <span className="tn-match-sides">{side(tie.slot_a, disc, 'tn-side-a', wonA)}<i aria-hidden="true" />{side(tie.slot_b, disc, 'tn-side-b', wonB)}</span>
        <span className="tn-match-result" aria-live="polite"><b className={exceptional ? 'tn-match-winner' : undefined}>{score}</b>
          {m?.tb_a != null && <small>Tie-break {m.tb_a}–{m.tb_b}</small>}
          {exceptional && <small>{teamName(m.winner === 'a' ? tie.slot_a : tie.slot_b)} won</small>}
          {m?.done ? <small className="tn-match-complete"><Check size={12} /> Final{scorable === 'done' && <> · tap to correct <ChevronRight size={13} /></>}</small>  : onScore && scorable !== 'done' ? <small>{decided ? 'Optional · tap to score' : 'Tap to score'} <ChevronRight size={13} /></small> : <small>{m && (m.score_a || m.score_b) ? 'Live' : 'To play'}</small>}
        </span>
      </>;
      const tappable = !!onScore && (scorable === 'all' || (scorable === 'open' ? !m?.done : !!m?.done));
      return tappable && onScore ? <Button variant="ghost" key={disc.key} className={`tn-match tn-match-v2${m?.done ? ' is-done' : ''}`} onClick={() => onScore(disc)}>{content}</Button>
        : <div key={disc.key} className={`tn-match tn-match-v2 tn-readonly-match${m?.done ? ' is-done' : ''}`}>{content}</div>;
    })}
  </section>)}</div>;
}