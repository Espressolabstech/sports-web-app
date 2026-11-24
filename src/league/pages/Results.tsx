import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronDown, Users } from 'lucide-react';
import { Button } from '@league/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@league/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@league/ui/dropdown-menu';
import { TeamLogo } from '@league/components/auction-ui';
import { RoundChips, TournamentShell, type RoundView } from '@league/components/tournament-ui';
import { TournamentTieCard } from '@league/components/tournament-tie-card';
import { TournamentMatchCards } from '@league/components/tournament-match-cards';
import { LeaguePlayerCard } from '@league/components/league-player-card';
import { LeagueTables } from '@league/components/league-tables';
import { useNow } from '@league/components/league-ui';
import { useTournament, type TournamentData } from '@league/hooks/use-tournament';
import { canViewLineups, tickLocks, useLeague, type LeagueState } from '@league/lib/league-store';
import { squadFor } from '@league/lib/league-squads';
import { pairingLabel, roundOf, teamCode, tieScore, type Tie } from '@league/lib/tournament';

const TABS = ['fixtures', 'tables', 'bracket', 'squads', 'lineups'] as const;
type Tab = typeof TABS[number];
/** The reference's /results search params, on react-router. */
function useResultsSearch() {
  const [params, setParams] = useSearchParams();
  const t = params.get('tab');
  const tab = TABS.find(x => x === t) ?? (t === 'standings' ? 'tables' : t === 'knockouts' ? 'bracket' : 'fixtures');
  const n = Number(params.get('tie'));
  const view: { tab: Tab; tie?: number } = Number.isInteger(n) && n > 0 ? { tab, tie: n } : { tab };
  const navigate = ({ search }: { search: { tab: Tab; tie?: number }; replace?: boolean }) => { const p = new URLSearchParams(); p.set('tab', search.tab); if (search.tie) p.set('tie', String(search.tie)); setParams(p, { replace: true }); };
  return { view, navigate };
}

const name = (d: TournamentData, slot: number | null) => slot == null ? 'TBD' : d.slots[slot]?.name ?? `Slot ${slot}`;

export function Results() {
  const { view, navigate } = useResultsSearch();
  const d = useTournament(); const s = useLeague(); const now = useNow(5000);
  const [round, setRound] = useState<RoundView>('all');
  const [squadTeam, setSquadTeam] = useState(1);
  useEffect(() => { if (now && d.loaded) tickLocks(d.ties); }, [now, d.loaded, d.ties]);
  const set = (v: { tab: Tab; tie?: number }) => void navigate({ search: v, replace: true });
  const card = (t: Tie) => <TieCard key={t.id} d={d} s={s} t={t} open={view.tie === t.id} toggle={() => set({ tab: view.tab, ...(view.tie === t.id ? {} : { tie: t.id }) })} />;
  return <TournamentShell kicker="" title="PUBLIC" onReset={d.reload} ties={d.ties}
    headingActions={<Button variant="outline" size="sm" onClick={() => set({ tab: view.tab === 'squads' ? 'fixtures' : 'squads' })}>{view.tab === 'squads' ? <ArrowLeft size={15} /> : <Users size={15} />}{view.tab === 'squads' ? 'Matches' : 'Squads'}</Button>}>
    {d.error && <p role="alert" className="text-sm text-destructive">{d.error}</p>}
    {view.tab !== 'squads' && <div className="tn-public-workspace">
      <div className="tn-round-toolbar"><RoundChips value={view.tab === 'tables' ? 'table' : round} onChange={r => { setRound(r); set({ tab: r === 'table' ? 'tables' : 'fixtures' }); }} /></div>
      {view.tab === 'tables' ? <LeagueTables d={d} /> : <ul className="tn-tie-list">{d.ties.filter(t => round === 'all' || roundOf(t.id) === round).map(card)}</ul>}
      {!d.loaded && <p className="tn-empty" role="status">Loading matches…</p>}
    </div>}
    {view.tab === 'squads' && <section className="tn-public-squad" aria-label={`${name(d, squadTeam)} squad`}>
      <div className="tn-squad-selector"><span className="section-kicker">Squads</span><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" aria-label="Choose team"><TeamLogo team={d.slots[squadTeam] ?? null} size={24} /><span>{name(d, squadTeam)}</span><ChevronDown size={16} /></Button></DropdownMenuTrigger><DropdownMenuContent className="pp-console" align="end">{[1, 2, 3, 4, 5, 6, 7, 8].map(n => <DropdownMenuItem key={n} onSelect={() => setSquadTeam(n)}><TeamLogo team={d.slots[n] ?? null} size={24} />{name(d, n)}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu></div>
      <ul className="tn-public-player-grid">{squadFor(teamCode(squadTeam)).map(p => <li key={p.id} className={`tn-public-player${p.gender === 'F' ? ' is-female' : ''}`}><LeaguePlayerCard player={p} /></li>)}</ul>
    </section>}
  </TournamentShell>;
}

function TieCard({ d, s, t, open, toggle }: { d: TournamentData; s: LeagueState; t: Tie; open: boolean; toggle: () => void }) {
  const ms = d.matches.filter(m => m.tie_id === t.id); const sc = tieScore(ms);
  const revealed = canViewLineups(s, t);
  return <li><TournamentTieCard label={`${t.label}${pairingLabel(t.id) && !t.slot_a ? ` · ${pairingLabel(t.id)}` : ''}`}
    a={{ name: name(d, t.slot_a), team: t.slot_a != null ? d.slots[t.slot_a] ?? null : null }}
    b={{ name: name(d, t.slot_b), team: t.slot_b != null ? d.slots[t.slot_b] ?? null : null }}
    pointsA={sc.a} pointsB={sc.b} winsA={sc.winsA} winsB={sc.winsB}
    disabled={!revealed} onClick={toggle}
    status={t.status === 'live' ? <span className="pp-status pp-status-warning">Live</span> : t.status === 'done' ? <span className="pp-status pp-status-success">Final</span> : undefined}
    note={!revealed ? 'Line-ups unlock at round lock-in' : undefined} />
  <Dialog open={open && revealed} onOpenChange={o => { if (!o && open) toggle(); }}><DialogContent className="pp-console tn-public-match-dialog"><DialogHeader><DialogTitle>{name(d, t.slot_a)} <span className="text-muted-foreground">vs</span> {name(d, t.slot_b)}</DialogTitle><DialogDescription>{t.label} · Matches {sc.winsA}–{sc.winsB} · {sc.a}–{sc.b} pts</DialogDescription></DialogHeader><div className="tn-public-match-scroll"><TournamentMatchCards d={d} tie={t} /></div></DialogContent></Dialog>
  </li>;
}
