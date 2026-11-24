import { useSearchParams } from 'react-router-dom';
import { Link } from '@league/lib/router';
import { useEffect, useMemo } from 'react';
import { ArrowLeft, CalendarDays, LogOut, Trophy, Users } from 'lucide-react';
import { Button } from '@league/ui/button';
import { TeamLogo } from '@league/components/auction-ui';
import { TournamentTieCard } from '@league/components/tournament-tie-card';
import { TournamentShell } from '@league/components/tournament-ui';
import { DummyLogin, LineupBuilder, LineupChip, lineupState, LockCountdown, NotConfirmed, useNow } from '@league/components/league-ui';
import { SquadGrid } from '@league/components/league-squad';
import { LeagueTables } from '@league/components/league-tables';
import { useTournament, type TournamentData } from '@league/hooks/use-tournament';
import { isOpen, lockAt, logout, opponentOf, teamTies, tickLocks, useLeague, type LeagueState } from '@league/lib/league-store';
import { roundName, roundOf, teamCode, tieScore, type Tie } from '@league/lib/tournament';

type Tab = 'lineup' | 'fixtures' | 'squad' | 'scores';
type Search = { tab?: Tab; tie?: number; as?: number };
/** The reference's /team search params, on react-router. */
function useTeamSearch() {
  const [params, setParams] = useSearchParams();
  const t = params.get('tab');
  const tab = t === 'lineup' ? 'fixtures' : (['fixtures', 'squad', 'scores'] as const).find(x => x === t);
  const tie = Number(params.get('tie')), as = Number(params.get('as'));
  const search: Search = { ...(tab ? { tab } : {}), ...(Number.isInteger(tie) && tie > 0 ? { tie } : {}), ...(Number.isInteger(as) && as >= 1 && as <= 8 ? { as } : {}) };
  const navigate = ({ search: next }: { search: Search }) => { const p = new URLSearchParams(); for (const [k, v] of Object.entries(next)) if (v !== undefined) p.set(k, String(v)); setParams(p); };
  return { search, navigate };
}

const teamName = (d: TournamentData, slot: number | null | undefined) => slot == null ? 'TBD' : d.slots[slot]?.name ?? `Team ${teamCode(slot)}`;

/** `signIn` sends / verifies the team OTP (the player app); organisers viewing ?as=N never see it. */
export function TeamPage({ signIn }: { signIn?: { send: (mobile: string) => Promise<string | null>; verify: (mobile: string, otp: string) => Promise<string | null> } }) {
  const { search, navigate } = useTeamSearch();
  const s = useLeague(); const d = useTournament(); const now = useNow();
  useEffect(() => { if (now && d.loaded) tickLocks(d.ties); }, [now, d.loaded, d.ties]);
  const viewAs = search.as != null && s.organiser ? search.as : undefined;
  const loading = !d.loaded && (search.as != null || !!s.session);
  const slot = viewAs ?? (s.session?.role === 'team' ? s.session.slot : undefined);
  const title = slot ? teamName(d, slot).toUpperCase() : 'TEAM SIGN-IN';
  return <TournamentShell kicker="THE COURT COLLECTIVE 2026 · TEAM" title={title} onReset={d.reload} teamWorkspace={slot != null}>
    {loading ? <p className="tn-empty" role="status">Loading…</p> : !slot ? <DummyLogin title="Team sign-in" hint="Use the mobile number your organisers registered for your team."
      check={m => signIn ? signIn.send(m) : 'Sign in from the team link.'}
      onDone={(m, otp) => signIn ? signIn.verify(m, otp) : undefined} />
      : <TeamWorkspace d={d} s={s} slot={slot} now={now} tab={search.tab ?? 'fixtures'} tieId={search.tie} viewAs={viewAs}
        go={p => void navigate({ search: { ...(viewAs ? { as: viewAs } : {}), ...p } })} />}
  </TournamentShell>;
}

function TeamWorkspace({ d, s, slot, now, tab, tieId, viewAs, go }: { d: TournamentData; s: LeagueState; slot: number; now: number; tab: Tab; tieId?: number | undefined; viewAs?: number | undefined; go: (p: { tab?: Tab; tie?: number }) => void }) {
  const mine = useMemo(() => teamTies(d.ties, slot), [d.ties, slot]);
  const nowMs = now || Date.now();
  const tie = mine.find(x => x.id === tieId && isOpen(x));
  const pendingRounds = ([4, 5] as const).filter(r => !mine.some(x => roundOf(x.id) === r));
  return <section className="lg-team-workspace">
    {viewAs && <div className="lg-banner"><span>Viewing as team</span><Link to="/scoring" search={{ panel: 'management', section: 'rounds' }}><ArrowLeft size={14} /> Back to organiser</Link></div>}
    <header className="lg-team-identity"><TeamLogo team={d.slots[slot] ?? null} size={40} /><div><h1>{teamName(d, slot)}</h1></div>
      {!viewAs && <Button variant="ghost" size="icon" aria-label="Sign out" title="Sign out" onClick={logout}><LogOut size={18} /></Button>}
    </header>
    <div className="lg-tabs lg-team-navigation" role="group" aria-label="Team sections">{([['fixtures', 'Fixtures', CalendarDays], ['squad', 'Squad', Users], ['scores', 'Scores', Trophy]] as const).map(([k, l, Icon]) =>
      <Button key={k} variant="ghost" aria-pressed={tab === k} onClick={() => go({ tab: k })}><Icon size={17} />{l}</Button>)}</div>
    {tab === 'fixtures' && (tie ? <div className="lg-grid">
      <Button variant="ghost" className="lg-fixture-back" onClick={() => go({ tab: 'fixtures' })}><ArrowLeft size={16} /> All fixtures</Button>
      <header className="lx-fixture-head"><div><p className="section-kicker">{roundName(roundOf(tie.id))} <span>· versus</span></p><h2>{teamName(d, opponentOf(tie, slot))}</h2></div>
        <div className="lx-fixture-meta"><LockCountdown s={s} tie={tie} now={now} lockAtMs={lockAt(s, tie).getTime()} /><NotConfirmed s={s} tie={tie} slot={slot} now={now} /></div></header>
      <TieLineup s={s} slot={slot} tie={tie} now={now} />
    </div> : <ul className="lg-fixture-list">{mine.map(x => {
      const open = isOpen(x); const sc = tieScore(d.matches.filter(m => m.tie_id === x.id));
      return <li key={x.id}><TournamentTieCard label={roundName(roundOf(x.id))}
        a={{ name: teamName(d, x.slot_a), team: x.slot_a != null ? d.slots[x.slot_a] ?? null : null }}
        b={{ name: teamName(d, x.slot_b), team: x.slot_b != null ? d.slots[x.slot_b] ?? null : null }}
        pointsA={sc.a} pointsB={sc.b} winsA={sc.winsA} winsB={sc.winsB} disabled={!open}
        status={<LineupChip state={lineupState(s, x, slot, nowMs)} team />} onClick={() => go({ tab: 'fixtures', tie: x.id })} />
      </li>;
    })}{pendingRounds.map(r => <li key={r}><TournamentTieCard label={roundName(r)} disabled
      a={{ name: teamName(d, slot), team: d.slots[slot] ?? null }} b={{ name: 'TBD', team: null }}
      pointsA={0} pointsB={0} winsA={0} winsB={0} note="Opponent pending" />
    </li>)}</ul>)}
    {tab === 'squad' && <SquadGrid code={teamCode(slot)} profiles={s.profiles ?? {}} />}
    {tab === 'scores' && <LeagueTables d={d} highlight={slot} />}
  </section>;
}

function TieLineup({ s, slot, tie, now }: { s: LeagueState; slot: number; tie: Tie; now: number }) {
  return <div className="lg-grid">
    <div>
      {!isOpen(tie) ? <p className="lg-note">This line-up opens once Round 3 is final and your opponent is known.</p>
        : <LineupBuilder s={s} tie={tie} slot={slot} mode="team" now={now} />}
    </div>
  </div>;
}
