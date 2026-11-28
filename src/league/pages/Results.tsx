import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronDown, ListOrdered, Swords, Users } from 'lucide-react';
import { Button } from '@league/ui/button';
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
  const navigate = ({ search, replace = true }: { search: { tab: Tab; tie?: number }; replace?: boolean }) => { const p = new URLSearchParams(); p.set('tab', search.tab); if (search.tie) p.set('tie', String(search.tie)); setParams(p, { replace }); };
  return { view, navigate };
}

const name = (d: TournamentData, slot: number | null) => slot == null ? 'TBD' : d.slots[slot]?.name ?? `Slot ${slot}`;

export function Results() {
  const { view, navigate } = useResultsSearch();
  const d = useTournament(); const s = useLeague(); const now = useNow(5000);
  const [round, setRound] = useState<RoundView>('all');
  const [squadTeam, setSquadTeam] = useState(1);
  useEffect(() => { if (now && d.loaded) tickLocks(d.ties); }, [now, d.loaded, d.ties]);
  const set = (v: { tab: Tab; tie?: number }, push = false) => void navigate({ search: v, replace: !push });
  const openTie = view.tie != null ? d.ties.find(t => t.id === view.tie && viewable(d, s, t)) : undefined;
  useEffect(() => { if (openTie) window.scrollTo({ top: 0 }); }, [openTie?.id]);
  const card = (t: Tie) => <TieCard key={t.id} d={d} s={s} t={t} open={() => set({ tab: 'fixtures', tie: t.id }, true)} />;
  return <TournamentShell kicker="" title="Fixtures & Results" compactHeading onReset={d.reload} ties={d.ties}>
    <nav className="tn-public-nav" aria-label="Public sections">{([
      ['tables', 'Table', ListOrdered], ['fixtures', 'Matches & Results', Swords], ['squads', 'Squads', Users],
    ] as const).map(([tab, label, Icon]) => <Button key={tab} variant="ghost" aria-current={(view.tab === tab || (tab === 'fixtures' && view.tab !== 'tables' && view.tab !== 'squads')) ? 'page' : undefined} onClick={() => set({ tab })}><Icon size={16} aria-hidden="true" /><span>{label}</span></Button>)}</nav>
    {d.error && <p role="alert" className="text-sm text-destructive">{d.error}</p>}
    {openTie ? <TieDetail d={d} t={openTie} back={() => set({ tab: 'fixtures' })} /> : <>
    {view.tab !== 'squads' && <div className="tn-public-workspace">
      {view.tab !== 'tables' && <div className="tn-round-toolbar"><RoundChips includeTable={false} value={round} onChange={r => setRound(r)} /></div>}
      {view.tab === 'tables' ? <LeagueTables d={d} expandable /> : <ul className="tn-tie-list">{d.ties.filter(t => round === 'all' || roundOf(t.id) === round).map(card)}</ul>}
      {!d.loaded && <p className="tn-empty" role="status">Loading matches…</p>}
    </div>}
    {view.tab === 'squads' && <section className="tn-public-squad" aria-label={`${name(d, squadTeam)} squad`}>
      <div className="tn-squad-selector"><span className="section-kicker">Squads</span><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" aria-label="Choose team"><TeamLogo team={d.slots[squadTeam] ?? null} size={24} /><span>{name(d, squadTeam)}</span><ChevronDown size={16} /></Button></DropdownMenuTrigger><DropdownMenuContent className="pp-console" align="end">{[1, 2, 3, 4, 5, 6, 7, 8].map(n => <DropdownMenuItem key={n} onSelect={() => setSquadTeam(n)}><TeamLogo team={d.slots[n] ?? null} size={24} />{name(d, n)}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu></div>
      <ul className="tn-public-player-grid">{squadFor(teamCode(squadTeam)).map(p => <li key={p.id} className={`tn-public-player${p.gender === 'F' ? ' is-female' : ''}`}><LeaguePlayerCard player={p} expanded showPhoto={false} /></li>)}</ul>
    </section>}
    </>}
  </TournamentShell>;
}

/** A tie opens once line-ups lock or any score exists, so finished results are always viewable. */
const viewable = (d: TournamentData, s: LeagueState, t: Tie) => canViewLineups(s, t) || t.status === 'live' || t.status === 'done' || d.matches.some(m => m.tie_id === t.id && (m.done || m.score_a > 0 || m.score_b > 0));

function tieProps(d: TournamentData, t: Tie) {
  const sc = tieScore(d.matches.filter(m => m.tie_id === t.id));
  return { label: `${t.label}${pairingLabel(t.id) && !t.slot_a ? ` · ${pairingLabel(t.id)}` : ''}`,
    a: { name: name(d, t.slot_a), team: t.slot_a != null ? d.slots[t.slot_a] ?? null : null },
    b: { name: name(d, t.slot_b), team: t.slot_b != null ? d.slots[t.slot_b] ?? null : null },
    pointsA: sc.a, pointsB: sc.b, winsA: sc.winsA, winsB: sc.winsB,
    status: t.status === 'live' ? <span className="pp-status pp-status-warning">Live</span> : t.status === 'done' ? <span className="pp-status pp-status-success">Final</span> : undefined };
}

function TieCard({ d, s, t, open }: { d: TournamentData; s: LeagueState; t: Tie; open: () => void }) {
  const revealed = viewable(d, s, t);
  return <li><TournamentTieCard variant="public" {...tieProps(d, t)} disabled={!revealed} onClick={open}
    note={!revealed ? 'Line-ups unlock at round lock-in' : undefined} /></li>;
}

function TieDetail({ d, t, back }: { d: TournamentData; t: Tie; back: () => void }) {
  return <section className="tn-public-detail" aria-label={`${name(d, t.slot_a)} vs ${name(d, t.slot_b)}`}>
    <Button size="sm" variant="outline" className="lg-home-back" onClick={back}><ArrowLeft size={18} /> All matches</Button>
    <TournamentTieCard variant="public" hero {...tieProps(d, t)} />
    <TournamentMatchCards d={d} tie={t} />
  </section>;
}
