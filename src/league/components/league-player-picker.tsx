import { useEffect, useState } from 'react';
import { Check, Plus, Search, Users, X } from 'lucide-react';
import { Button } from '@league/ui/button';
import { Input } from '@league/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@league/ui/sheet';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@league/ui/alert-dialog';
import { LeaguePlayerCard } from '@league/components/league-player-card';
import { canPlace, eligible, replacementEligibility, SPOTS, type LeaguePlayer, type Lineup, type Spot, type Sport } from '@league/lib/lineup-rules';

export function PlayerLevels({ player, sport, only }: { player: LeaguePlayer; sport?: Sport; only?: Sport }) {
  if (only) return <span className="lg-player-levels is-single"><span className="is-focus"><small>{only}</small><b>{only === 'Padel' ? player.padel : player.pickleball}</b></span></span>;
  return <span className="lg-player-levels">
    <span className={sport === 'Padel' ? 'is-focus' : undefined}><small>Padel</small><b>{player.padel}</b></span>
    <span className={sport === 'Pickleball' ? 'is-focus' : undefined}><small>Pickleball</small><b>{player.pickleball}</b></span>
  </span>;
}

export function SquadOverview({ squad, lineup, hideCounts = false }: { squad: LeaguePlayer[]; lineup: Lineup; hideCounts?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { setExpanded(window.innerWidth >= 1000); }, []);
  const unused = squad.filter(p => !Object.values(lineup).includes(p.id));
  return <details className="lg-squad-overview" open={expanded} onToggle={e => setExpanded(e.currentTarget.open)}>
    <summary><Users size={16} /><strong>Your squad</strong>{!hideCounts && <span>{unused.length} not yet used</span>}</summary>
    <ul className="lx-card-grid">{squad.map(p => {
      const assigned = SPOTS.filter(sp => lineup[sp.id] === p.id);
      return <li key={p.id} className={`lx-tile lx-mini${assigned.length ? ' is-assigned' : ''}`}>
        <LeaguePlayerCard player={p} chips={assigned.map(sp => <span key={sp.id} className="lx-chip">{sp.code}</span>)} />
      </li>;
    })}</ul>
  </details>;
}

export function PlayerPicker({ spot, squad, lineup, organiser, readOnly, onChange, replace = false }: {
  spot: Spot; squad: LeaguePlayer[]; lineup: Lineup; organiser: boolean; readOnly: boolean; replace?: boolean;
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState<{ id: string | null; name: string } | null>(null);
  const choose = (id: string | null, name: string) => {
    setOpen(false);
    if (id === (lineup[spot.id] ?? null)) return;
    if (organiser) setPending({ id, name });
    else onChange(id);
  };
  const selected = squad.find(p => p.id === lineup[spot.id]);
  const visible = squad.filter(p => `${p.name} ${p.no}`.toLowerCase().includes(query.toLowerCase()));
  const isOpen = (p: LeaguePlayer) => organiser || canPlace(lineup, spot.id, p) || p.id === selected?.id;
  const ordered = [...visible].sort((a, b) => Number(isOpen(b)) - Number(isOpen(a)));
  // Both sport levels on every card, also for Intermediate slots (organisers asked; eligibility still uses that sport's level).
  const only = {};
  const slotLabel = spot.match === 'Open Mixed' ? spot.need === 'woman' ? 'Female player' : 'Male player' : spot.discipline === 'pb_singles' ? 'Player' : `Player ${spot.id.endsWith('.0') ? '1' : '2'}`;
  const requirement = replace ? 'Injury replacement · Beginner or lower level than the player replaced' : spot.need === 'inter' ? 'Beginners and intermediates only' : `${spot.need === 'woman' ? 'Female' : 'Male'} · all ${spot.sport} levels`;
  return <>
    <Button variant="outline" className={`lx-tile lx-slot${selected ? ' is-filled' : ''}`} disabled={readOnly}
      aria-label={`${replace ? 'Replace player in' : selected ? 'Change' : 'Choose'} ${spot.code} ${spot.label}`} onClick={() => { setQuery(''); setOpen(true); }}>
      {selected ? <LeaguePlayerCard player={selected} {...only} {...(replace ? { foot: 'Replace player' } : {})} />
        : <><span className="lx-slot-label">{slotLabel}</span><span className="lx-slot-empty"><Plus size={16} /> Select</span></>}
    </Button>
    <Sheet open={open && !readOnly} onOpenChange={setOpen}>
      <SheetContent side="right" className="pp-console hub-sheet lg-player-picker lx-picker">
        <SheetHeader><SheetTitle>{replace ? 'Replace player · ' : ''}{spot.code} · {spot.match}</SheetTitle><SheetDescription><span className="lx-chip is-rule">{requirement}</span></SheetDescription></SheetHeader>
        <div className="host-search lg-picker-search"><Search size={16} /><Input aria-label="Search squad players" placeholder="Search name or number" value={query} onChange={e => setQuery(e.target.value)} /></div>
        {query && <p className="lx-count"><strong>{visible.length}</strong> of {squad.length}</p>}<div className="lx-picker-grid">
          {ordered.map(p => {
            const assigned = SPOTS.filter(sp => lineup[sp.id] === p.id && sp.id !== spot.id);
            const rep = replace && selected ? replacementEligibility(lineup, spot.id, selected, p) : null;
            const available = rep ? rep.ok : organiser || canPlace(lineup, spot.id, p);
            const reason = rep ? rep.reasons.join(' · ') : !eligible(p, spot) ? spot.need === 'inter' ? 'Advanced' : spot.need === 'woman' ? 'Female only' : 'Male only' : assigned.some(sp => sp.sport === spot.sport) ? `Used in ${spot.sport}` : 'Limit reached';
            return <Button variant="outline" key={p.id} className="lx-tile lx-pick" aria-label={`Select ${p.name}`} aria-pressed={selected?.id === p.id} disabled={!available}
              onClick={() => { if (!available) return; choose(p.id, p.name); }}>
              <LeaguePlayerCard player={p} {...only} chips={<>{selected?.id === p.id && <span className="lx-chip is-selected"><Check size={11} /> Selected</span>}{!available ? <span className="lx-chip is-blocked">{reason}</span> : assigned.map(sp => <span key={sp.id} className="lx-chip">{sp.code}</span>)}</>} />
            </Button>;
          })}
          {!visible.length && <p className="lg-note">{query ? 'No players match your search.' : 'No eligible players available. Change another match selection to free a player.'}</p>}
        </div>
        <footer>{selected && !replace && <Button variant="ghost" onClick={() => choose(null, 'Empty spot')}><X size={16} /> Remove player</Button>}<Button variant="outline" onClick={() => setOpen(false)}>Close</Button></footer>
      </SheetContent>
    </Sheet>
    <AlertDialog open={pending !== null} onOpenChange={open => { if (!open) setPending(null); }}>
      <AlertDialogContent className="pp-console tn-round-dialog">
        <AlertDialogHeader><AlertDialogTitle>{replace ? 'Confirm player replacement?' : 'Confirm squad change?'}</AlertDialogTitle>
          <AlertDialogDescription>{spot.code} · {spot.match} · {slotLabel}<br />{selected?.name ?? 'Empty spot'} → {pending?.name}
            <br />{replace ? 'This updates the locked line-up and marks this spot as changed after lock.' : 'This updates your draft. Save the line-up to apply it.'}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><Button onClick={() => { if (!pending || readOnly) return; onChange(pending.id); setPending(null); }}>Confirm change</Button></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}