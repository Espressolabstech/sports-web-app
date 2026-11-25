import { useSearchParams } from 'react-router-dom';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronLeft, ChevronRight, Copy, ExternalLink, LogOut, Menu as MenuIcon, Settings2, Lock, LockOpen } from 'lucide-react';
import { toast } from 'sonner';
import { leagueLinks } from '@league/lib/links';
import { Button } from '@league/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@league/ui/dropdown-menu';
import { TeamLogo } from '@league/components/auction-ui';
import { OrganiserManagement, type ManagementSection } from '@league/components/organiser-management';
import { RoundChips, TournamentShell, type RoundView } from '@league/components/tournament-ui';
import { TournamentTieCard } from '@league/components/tournament-tie-card';
import { TournamentMatchCards } from '@league/components/tournament-match-cards';
import { LeagueTables } from '@league/components/league-tables';
import { lineupState, useNow } from '@league/components/league-ui';
import { ManageRound } from '@league/components/round-management';
import { logoutOrganiser, tickLocks, useLeague } from '@league/lib/league-store';
import { useTournament, type TournamentData } from '@league/hooks/use-tournament';
import { fmtPts, roundOf, TIE_BONUS, tieScore, type Discipline, type Tie } from '@league/lib/tournament';
import { MatchSheet } from '@league/components/match-sheet';

type ScoringSearch = { tie?: number; panel?: 'management'; section?: ManagementSection };
/** The reference's /scoring search params, on react-router. */
function useScoringSearch(defaultPanel: boolean) {
  const [params, setParams] = useSearchParams();
  const n = Number(params.get('tie'));
  const panelParam = params.get('panel') ?? (defaultPanel ? 'management' : null);
  const management = ['management', 'setup', 'league'].includes(String(panelParam));
  const sec = params.get('section');
  const section: ManagementSection = sec === 'teams' || sec === 'matchups' || sec === 'scores' || sec === 'rounds' ? sec : panelParam === 'setup' || defaultPanel ? 'teams' : 'rounds';
  const search: ScoringSearch = { ...(Number.isInteger(n) && n > 0 ? { tie: n } : {}), ...(management ? { panel: 'management', section } : {}) };
  const navigate = ({ search: next }: { search: ScoringSearch }) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v !== undefined) p.set(k, String(v));
    setParams(p);
  };
  return { search, navigate };
}

const teamName = (d: TournamentData, slot: number | null) => slot == null ? 'TBD' : d.slots[slot]?.name ?? `Slot ${slot}`;
const statusLabel = (s: string) => s === 'live' ? 'Live' : s === 'done' ? 'Done' : 'Up next';

export function Scoring() {
  const d = useTournament();
  const notSetUp = d.view?.setUp === false;
  const { search: { tie, panel, section }, navigate } = useScoringSearch(notSetUp);
  const league = useLeague();
  const current = d.ties.find(t => t.id === tie);
  return <TournamentShell kicker="THE COURT COLLECTIVE 2026 · HOSTS" title={current ? current.label.toUpperCase() : panel ? 'MANAGEMENT' : 'SCORER'} onReset={d.reload} ties={d.ties}
    beforeHeading={current ? <TieBar tie={current} onBack={() => void navigate({ search: {} })} /> : undefined}
    headerActions={league.organiser ? <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="tn-organiser-menu-trigger"><MenuIcon size={18} />Menu</Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="pp-console tn-organiser-menu">
        <DropdownMenuLabel>Organiser</DropdownMenuLabel><DropdownMenuSeparator />
        <DropdownMenuItem data-active={!panel} onSelect={() => void navigate({ search: {} })}><ChevronRight size={18} /><span>Scoring</span>{!panel && <Check size={15} />}</DropdownMenuItem>
        <DropdownMenuItem data-active={!!panel} onSelect={() => void navigate({ search: { panel: 'management', section: 'rounds' } })}><Settings2 size={18} /><span>Management</span>{panel && <Check size={15} />}</DropdownMenuItem>
        {leagueLinks.share.team && <><DropdownMenuSeparator /><DropdownMenuLabel>Share</DropdownMenuLabel>
          {([['Team page', leagueLinks.share.team], ['Public page', leagueLinks.share.public]] as const).map(([label, url]) => <DropdownMenuItem key={label} onSelect={() => window.open(url, '_blank', 'noopener')}><ExternalLink size={18} /><span>Open {label.toLowerCase()}</span></DropdownMenuItem>)}
          {([['Team page', leagueLinks.share.team], ['Public page', leagueLinks.share.public]] as const).map(([label, url]) => <DropdownMenuItem key={`copy-${label}`} onSelect={() => { void navigator.clipboard.writeText(url).then(() => toast.success(`${label} link copied`), () => toast.error(url)); }}><Copy size={18} /><span>Copy {label.toLowerCase()} link</span></DropdownMenuItem>)}</>}
        <DropdownMenuSeparator /><DropdownMenuItem onSelect={logoutOrganiser}><LogOut size={18} /><span>Sign out</span></DropdownMenuItem>
      </DropdownMenuContent></DropdownMenu> : undefined}>
    <OrganiserGate d={d}>
      {d.error && <p role="alert" className="text-sm text-destructive">{d.error}</p>}
      {current ? <TieScreen d={d} tie={current} />
        : <>
          {panel ? <OrganiserManagement d={d} section={section ?? 'rounds'} onChange={next => void navigate({ search: { panel: 'management', section: next } })} />
            : <TieList d={d} open={id => void navigate({ search: { tie: id } })} />}
        </>}
    </OrganiserGate>
  </TournamentShell>;
}

/** Sticky back control for a single tie: shows the tie name only once the page heading has scrolled away. */
function TieBar({ tie, onBack }: { tie: Tie; onBack: () => void }) {
  const [stuck, setStuck] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = sentinel.current; if (!el) return;
    const io = new IntersectionObserver(entries => { const e = entries[0]; setStuck(e ? !e.isIntersecting : false); }, { threshold: 0 });
    io.observe(el); return () => io.disconnect(); }, []);
  return <>
    <div ref={sentinel} className="tn-tie-sentinel" aria-hidden="true" />
    <div className={`tn-tie-bar${stuck ? ' is-stuck' : ''}`}>
      <Button variant="ghost" size="sm" className="tn-tie-back" onClick={onBack}><ChevronLeft size={18} />All ties</Button>
      <span>{tie.label}</span>
    </div>
  </>;
}

function TieList({ d, open }: { d: TournamentData; open: (id: number) => void }) {
  const [round, setRound] = useState<RoundView>('all');
  const list = d.ties.filter(t => round === 'all' || roundOf(t.id) === round)
    .sort((a, b) => Number(b.status === 'live') - Number(a.status === 'live') || a.id - b.id);
  return <>
    <div className="tn-round-toolbar">
      <RoundChips value={round} onChange={setRound} />
    </div>
    {round === 'table' ? <LeagueTables d={d} /> : <>
    {round !== 'all' && <div className="tn-manage-actions"><ManageRound round={round} d={d} /></div>}
    <ul className="tn-tie-list">{list.map(t => { const s = tieScore(d.matches.filter(m => m.tie_id === t.id)); const ready = t.slot_a != null && t.slot_b != null;
      return <li key={t.id}><TournamentTieCard label={t.label}
        a={{ name: teamName(d, t.slot_a), team: t.slot_a != null ? d.slots[t.slot_a] ?? null : null, state: <LockDot t={t} slot={t.slot_a} /> }}
        b={{ name: teamName(d, t.slot_b), team: t.slot_b != null ? d.slots[t.slot_b] ?? null : null, state: <LockDot t={t} slot={t.slot_b} /> }}
        pointsA={s.a} pointsB={s.b} winsA={s.winsA} winsB={s.winsB} disabled={!ready} onClick={() => open(t.id)}
        status={t.status !== 'scheduled' ? <span className={`pp-status${t.status === 'live' ? ' pp-status-warning' : ' pp-status-success'}`}>{statusLabel(t.status)}</span> : undefined} />
      </li>; })}</ul>
    {!d.loaded && <p className="tn-empty" role="status">Loading matches…</p>}
    {d.loaded && !list.length && <p className="tn-empty">No ties in this round.</p>}
    </>}
  </>;
}

function LockDot({ t, slot }: { t: Tie; slot: number | null }) {
  const s = useLeague(); const now = useNow(5000);
  if (slot == null) return null;
  const st = lineupState(s, t, slot, now || Date.now()); const ok = ['confirmed', 'locked', 'auto', 'changed'].includes(st);
  return <span className={`tn-lock-dot${ok ? ' is-ok' : ''}`} role="img" aria-label={ok ? 'Squad locked in' : 'Squad not locked in'} title={ok ? 'Squad locked in' : 'Squad not locked in'}>{ok ? <Lock size={11} /> : <LockOpen size={11} />}</span>;
}

function TieScreen({ d, tie }: { d: TournamentData; tie: Tie }) {
  const ms = d.matches.filter(m => m.tie_id === tie.id);
  const s = tieScore(ms);
  const [edit, setEdit] = useState<Discipline | null>(null);
  return <>
    <section className="tn-scoreboard tn-points-board" aria-label="Tie score" aria-live="polite">
      <span className="tn-score-versus" aria-hidden="true">VS</span>
      {(['a', 'b'] as const).map(side => { const slot = side === 'a' ? tie.slot_a : tie.slot_b; return <div className="tn-team-points" key={side}><TeamLogo team={slot != null ? d.slots[slot] : null} size={40} /><span>{teamName(d, slot)}</span><strong>{fmtPts(side === 'a' ? s.a : s.b)}</strong><small>points</small></div>; })}
      <div className="tn-points-footer">
        <div className="tn-match-tally" aria-label="Matches won by each team"><b aria-label={`${teamName(d, tie.slot_a)}: ${s.winsA} matches won`}>{s.winsA}</b><span>Matches won</span><b aria-label={`${teamName(d, tie.slot_b)}: ${s.winsB} matches won`}>{s.winsB}</b></div>
        <div className="tn-tie-summary">{s.winner ? <><strong>{teamName(d, s.winner === 'a' ? tie.slot_a : tie.slot_b)} wins the tie</strong><small>+{TIE_BONUS} bonus included in points</small></> : <strong>{ms.filter(m => m.done).length} of 7 matches complete</strong>}</div>
        {s.winner && <small className="tn-tie-progress">{ms.filter(m => m.done).length} of 7 matches complete</small>}
      </div>
    </section>
    <TournamentMatchCards d={d} tie={tie} onScore={setEdit} scorable="open" />
    <MatchSheet key={edit?.key ?? 'none'} tie={tie} d={d} disc={edit} match={ms.find(x => x.discipline === edit?.key)} close={() => setEdit(null)} />
  </>;
}

function OrganiserGate({ children, d }: { children: ReactNode; d: TournamentData }) {
  // Organisers are already signed in through the host login (the host workspace checks access on every request).
  useEffect(() => { if (!d.loaded) return; tickLocks(d.ties); const t = setInterval(() => tickLocks(d.ties), 5000); return () => clearInterval(t); }, [d.loaded, d.ties]);
  if (!d.loaded) return <p className="tn-empty" role="status">Loading…</p>;
  return <>{children}</>;
}
