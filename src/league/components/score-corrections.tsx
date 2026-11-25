import { useState } from 'react';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { Button } from '@league/ui/button';
import { TournamentTieCard } from '@league/components/tournament-tie-card';
import { TournamentMatchCards } from '@league/components/tournament-match-cards';
import { MatchSheet } from '@league/components/match-sheet';
import type { TournamentData } from '@league/hooks/use-tournament';
import { roundName, roundOf, tieScore, type Discipline } from '@league/lib/tournament';

const name = (d: TournamentData, slot: number | null) => slot == null ? 'TBD' : d.slots[slot]?.name ?? `Slot ${slot}`;

/** Management-only override of confirmed results: pick tie → pick final match → edit → review with reason. */
export function ScoreCorrections({ d }: { d: TournamentData }) {
  const [tieId, setTieId] = useState<number | null>(null);
  const [edit, setEdit] = useState<Discipline | null>(null);
  const scored = d.ties.filter(t => d.matches.some(m => m.tie_id === t.id && m.done));
  const tie = scored.find(t => t.id === tieId);
  if (tie) return <div className="tn-corrections">
    <Button variant="ghost" className="lg-fixture-back" onClick={() => setTieId(null)}><ArrowLeft size={16} /> All scored ties</Button>
    <h2 className="text-lg font-semibold">{name(d, tie.slot_a)} vs {name(d, tie.slot_b)}</h2>
    <p className="text-sm text-muted-foreground">Tap a final match to correct it.</p>
    <TournamentMatchCards d={d} tie={tie} onScore={setEdit} scorable="done" />
    <MatchSheet key={edit?.key ?? 'none'} override tie={tie} d={d} disc={edit} match={d.matches.find(m => m.tie_id === tie.id && m.discipline === edit?.key)} close={() => setEdit(null)} />
  </div>;
  return <div className="tn-corrections">
    <div className="lg-note flex gap-2"><ShieldAlert size={18} className="shrink-0" /><span>Confirmed scores are final in the scorer. Use this only to fix a mistake — every change needs a reason and updates standings for everyone.</span></div>
    {!scored.length ? <p className="tn-empty">No confirmed scores yet.</p> : <ul className="tn-tie-list">{scored.map(t => { const sc = tieScore(d.matches.filter(m => m.tie_id === t.id)); return <li key={t.id}>
      <TournamentTieCard label={roundName(roundOf(t.id))} a={{ name: name(d, t.slot_a), team: t.slot_a != null ? d.slots[t.slot_a] ?? null : null }} b={{ name: name(d, t.slot_b), team: t.slot_b != null ? d.slots[t.slot_b] ?? null : null }}
        pointsA={sc.a} pointsB={sc.b} winsA={sc.winsA} winsB={sc.winsB} onClick={() => setTieId(t.id)} />
    </li>; })}</ul>}
  </div>;
}
