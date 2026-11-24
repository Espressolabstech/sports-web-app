import { useEffect, useState } from 'react';
import { Check, Plus, Search, Users, X } from 'lucide-react';
import { Button } from '@league/ui/button';
import { Input } from '@league/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@league/ui/sheet';
import { LeaguePlayerCard } from '@league/components/league-player-card';
import { canPlace, eligible, replacementEligibility, SPOTS, type LeaguePlayer, type Lineup, type Spot, type Sport } from '@league/lib/lineup-rules';

export function PlayerLevels({ player, sport, only }: { player: LeaguePlayer; sport?: Sport; only?: Sport }) {
  if (only) return <span className="lg-player-levels is-single"><span className="is-focus"><small>{only}</small><b>{only === 'Padel' ? player.padel : player.pickleball}</b></span></span>;
  return <span className="lg-player-levels">
    <span className={sport === 'Padel' ? 'is-focus' : undefined}><small>Padel</small><b>{player.padel}</b></span>
    <span className={sport === 'Pickleball' ? 'is-focus' : undefined}><small>Pickleball</small><b>{player.pickleball}</b></span>
  </span>;
}

function PlayerDetails({ player, sport, only }: { player: LeaguePlayer; sport?: Sport; only?: Sport }) {
  return <span className="lg-player-details">
    <span className="lg-player-identity"><strong>{player.name}</strong><span className="lg-no">#{player.no}</span></span>
    <PlayerLevels player={player} {...(sport ? { sport } : {})} {...(only ? { only } : {})} />
    <span className="lg-player-gender"><small>Gender</small><b>{player.gender === 'F' ? 'Female' : 'Male'}</b></span>
  </span>;
}


export function SquadOverview({ squad, lineup, hideCounts = false }: { squad: LeaguePlayer[]; lineup: Lineup; hideCounts?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => { setExpanded(window.innerWidth >= 1000); }, []);
  const unused = squad.filter(p => !Object.values(lineup).includes(p.id));
  return <details className="lg-squad-overview" open={expanded} onToggle={e => setExpanded(e.currentTarget.open)}>
    <summary><Users size={16} /><strong>Your squad</strong>{!hideCounts && <span>{unused.length} not yet used</span>}</summary>
    <ul>{squad.map(p => {
      const assigned = SPOTS.filter(sp => lineup[sp.id] === p.id);
      return <li key={p.id} className={assigned.length ? 'is-assigned' : undefined}>
        <PlayerDetails player={p} />
        <span className="lg-player-assignment">{assigned.length ? assigned.map(sp => `${sp.code} ${sp.match}`).join(' · ') : 'Not yet used'}</span>
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
  const selected = squad.find(p => p.id === lineup[spot.id]);
  const visible = squad.filter(p => `${p.name} ${p.no}`.toLowerCase().includes(query.toLowerCase()));
  // Both sport levels on every card, also for Intermediate slots (organisers asked; eligibility still uses that sport's level).
  const only = {};
  const slotLabel = spot.match === 'Open Mixed' ? spot.need === 'woman' ? 'Female player' : 'Male player' : spot.discipline === 'pb_singles' ? 'Player' : `Player ${spot.id.endsWith('.0') ? '1' : '2'}`;
  const requirement = replace ? 'Injury replacement · Beginner or lower level than the player replaced' : spot.need === 'inter' ? 'Beginners and intermediates only' : `${spot.need === 'woman' ? 'Female' : 'Male'} · all ${spot.sport} levels`;
  return <>
    <Button variant="outline" className={`lx-tile lx-slot${selected ? ' is-filled' : ''}`} disabled={readOnly}
      aria-label={`${replace ? 'Replace player in' : selected ? 'Change' : 'Choose'} ${spot.code} ${spot.label}`} onClick={() => { setQuery(''); setOpen(true); }}>
      {selected ? <LeaguePlayerCard player={selected} {...only} {...(replace ? { foot: 'Replace player' } : {})} />
        : <><span className="lx-slot-label">{slotLabel}</span><span className="lx-slot-empty"><Plus size={16} /> Select player</span></>}
    </Button>
    <Sheet open={open && !readOnly} onOpenChange={setOpen}>
      <SheetContent side="right" className="pp-console hub-sheet lg-player-picker lx-picker">
        <SheetHeader><SheetTitle>{replace ? 'Replace player · ' : ''}{spot.code} · {spot.match}</SheetTitle><SheetDescription>{requirement}</SheetDescription></SheetHeader>
        <div className="host-search lg-picker-search"><Search size={16} /><Input aria-label="Search squad players" placeholder="Search name or number" value={query} onChange={e => setQuery(e.target.value)} /></div>
        <p className="lx-count">All players <span aria-hidden>—</span> <strong>{visible.length} players</strong></p><div className="lx-picker-grid">
          {visible.map(p => {
            const assigned = SPOTS.filter(sp => lineup[sp.id] === p.id && sp.id !== spot.id);
            const rep = replace && selected ? replacementEligibility(lineup, spot.id, selected, p) : null;
            const available = rep ? rep.ok : organiser || canPlace(lineup, spot.id, p);
            const reason = rep ? rep.reasons.join(' · ') : !eligible(p, spot) ? spot.need === 'inter' ? `Advanced in ${spot.sport}` : `${spot.need === 'woman' ? 'Female' : 'Male'} players only` : assigned.some(sp => sp.sport === spot.sport) ? `Already selected for ${spot.sport}` : 'Both-sport player limit reached';
            return <Button variant="outline" key={p.id} className="lx-tile lx-pick" aria-label={`Select ${p.name}`} aria-pressed={selected?.id === p.id} disabled={!available}
              onClick={() => { if (!available) return; onChange(p.id); setOpen(false); }}>
              <LeaguePlayerCard player={p} {...only} {...(!available ? { foot: reason } : assigned.length || selected?.id === p.id ? { foot: <>{selected?.id === p.id && <Check size={13} />}{assigned.map(sp => `${sp.code} · ${sp.sport}`).join(' / ') || 'Selected'}</> } : {})} />
            </Button>;
          })}
          {!visible.length && <p className="lg-note">{query ? 'No players match your search.' : 'No eligible players available. Change another match selection to free a player.'}</p>}
        </div>
        <footer>{selected && !replace && <Button variant="ghost" onClick={() => { onChange(null); setOpen(false); }}><X size={16} /> Remove player</Button>}<Button variant="outline" onClick={() => setOpen(false)}>Close</Button></footer>
      </SheetContent>
    </Sheet>
  </>;
}