import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Link } from '@league/lib/router';
import { leagueLinks } from '@league/lib/links';
import { useEffect, useMemo } from 'react';
import { ArrowLeft, ArrowUpRight, ChevronRight, ClipboardList, LogOut, Users } from 'lucide-react';
import { Button } from '@league/ui/button';
import { TeamLogo } from '@league/components/auction-ui';
import { TournamentShell } from '@league/components/tournament-ui';
import { DummyLogin, LineupBuilder, LineupChip, lineupState, LockCountdown, MatchBoardCard, NotConfirmed, useNow } from '@league/components/league-ui';
import { SquadGrid } from '@league/components/league-squad';
import { LeagueTables } from '@league/components/league-tables';
import { useTournament, type TournamentData } from '@league/hooks/use-tournament';
import { isOpen, lockAt, logout, opponentOf, teamTies, tickLocks, useLeague, type LeagueState } from '@league/lib/league-store';
import { roundName, roundOf, teamCode, type Tie } from '@league/lib/tournament';

type Tab = 'lineup' | 'home' | 'fixtures' | 'squad' | 'scores';
type Search = { tab?: Tab; tie?: number; as?: number };
/** The reference's /team search params, on react-router. */
function useTeamSearch() {
  const [params, setParams] = useSearchParams();
  const t = params.get('tab');
  const tab = t === 'lineup' ? 'fixtures' : (['home', 'fixtures', 'squad', 'scores'] as const).find(x => x === t);
  const tie = Number(params.get('tie')), as = Number(params.get('as'));
  const search: Search = { ...(tab ? { tab } : {}), ...(Number.isInteger(tie) && tie > 0 ? { tie } : {}), ...(Number.isInteger(as) && as >= 1 && as <= 8 ? { as } : {}) };
  const navigate = ({ search: next }: { search: Search }) => { const p = new URLSearchParams(); for (const [k, v] of Object.entries(next)) if (v !== undefined) p.set(k, String(v)); setParams(p); };
  return { search, navigate };
}

const teamName = (d: TournamentData, slot: number | null | undefined) => slot == null ? 'TBD' : d.slots[slot]?.name ?? `Team ${teamCode(slot)}`;

/** `signIn` sends / verifies the team OTP (the player app); organisers viewing ?as=N never see it. */
export function TeamPage({ signIn, signedIn }: { signedIn?: boolean; signIn?: { send: (mobile: string) => Promise<string | null>; verify: (mobile: string, otp: string) => Promise<string | null> } }) {
  const { search, navigate } = useTeamSearch();
  const s = useLeague(); const d = useTournament(); const now = useNow();
  useEffect(() => { if (now && d.loaded) tickLocks(d.ties); }, [now, d.loaded, d.ties]);
  const viewAs = search.as != null && s.organiser ? search.as : undefined;
  // A stored team token: keep the loader up until the team view arrives (no flash of the sign-in form).
  const loading = !d.loaded && (search.as != null || !!s.session || !!signedIn);
  const slot = viewAs ?? (s.session?.role === 'team' ? s.session.slot : undefined);
  const title = slot ? teamName(d, slot).toUpperCase() : 'TEAM SIGN-IN';
  return <TournamentShell kicker="THE COURT COLLECTIVE 2026 · TEAM" title={title} onReset={d.reload} teamWorkspace={slot != null}>
    {loading ? <p className="tn-empty" role="status">Loading…</p> : !slot ? <DummyLogin title="Team sign-in" hint="Use the mobile number your organisers registered for your team."
      check={m => signIn ? signIn.send(m) : 'Sign in from the team link.'}
      onDone={(m, otp) => signIn ? signIn.verify(m, otp) : undefined} />
      : <TeamWorkspace d={d} s={s} slot={slot} now={now} tab={search.tab ?? 'home'} tieId={search.tie} viewAs={viewAs}
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
    {tab !== 'home' && <header className="lg-team-identity"><TeamLogo team={d.slots[slot] ?? null} size={28} /><div><h1>{teamName(d, slot)}</h1></div>
    </header>}
    {tab !== 'home' && !(tab === 'fixtures' && tie) && <Button size="sm" variant="outline" className="lg-home-back" onClick={() => go({ tab: 'home' })}><ArrowLeft size={18} /> Go back to home</Button>}
    {tab === 'home' && <TeamHome d={d} s={s} slot={slot} next={mine.find(x => ['empty', 'progress', 'complete', 'confirmed'].includes(lineupState(s, x, slot, nowMs)))} viewAs={viewAs} go={go} />}
    {tab === 'fixtures' && (tie ? <div className="lg-grid">
      <Button size="sm" variant="outline" className="lg-home-back" onClick={() => go({ tab: 'fixtures' })}><ArrowLeft size={18} /> All fixtures</Button>
      <TieLineup s={s} slot={slot} tie={tie} now={now} head={<header className="lg-board-head">
        <p className="lg-board-kicker">{roundName(roundOf(tie.id))}</p>
        <div className="lg-board-teams"><div><TeamLogo team={d.slots[slot] ?? null} size={44} /><b>{teamName(d, slot)}</b></div><span className="lg-board-vs">VS</span><div><TeamLogo team={(() => { const o = opponentOf(tie, slot); return o != null ? d.slots[o] ?? null : null; })()} size={44} /><b>{teamName(d, opponentOf(tie, slot))}</b></div></div>
        <LockCountdown s={s} tie={tie} now={now} lockAtMs={lockAt(s, tie).getTime()} />
        <NotConfirmed s={s} tie={tie} slot={slot} now={now} />
      </header>} />
    </div> : <ul className="lg-fixture-list">{mine.map(x => {
      const open = isOpen(x);
      return <li key={x.id}><MatchBoardCard label={roundName(roundOf(x.id))}
        a={{ name: teamName(d, x.slot_a), team: x.slot_a != null ? d.slots[x.slot_a] ?? null : null }}
        b={{ name: teamName(d, x.slot_b), team: x.slot_b != null ? d.slots[x.slot_b] ?? null : null }}
        disabled={!open} status={<LineupChip state={lineupState(s, x, slot, nowMs)} soft />}
        onClick={() => go({ tab: 'fixtures', tie: x.id })} />
      </li>;
    })}{pendingRounds.map(r => <li key={r}><MatchBoardCard label={roundName(r)} disabled
      a={{ name: teamName(d, slot), team: d.slots[slot] ?? null }} b={{ name: 'TBD', team: null }}
      status={<LineupChip state="closed" />} />
    </li>)}</ul>)}
    {tab === 'squad' && <SquadGrid code={teamCode(slot)} profiles={s.profiles ?? {}} />}
    {tab === 'scores' && <LeagueTables d={d} highlight={slot} />}
  </section>;
}

function TieLineup({ s, slot, tie, now, head }: { s: LeagueState; slot: number; tie: Tie; now: number; head?: ReactNode }) {
  return <div className="lg-grid">
    <div>
      {!isOpen(tie) ? <>{head}<p className="lg-note">This line-up opens once Round 3 is final and your opponent is known.</p></>
        : <LineupBuilder s={s} tie={tie} slot={slot} mode="team" now={now} head={head} />}
    </div>
  </div>;
}

const fmtLock = (d: Date) => d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }) + ' IST';

function TeamHome({ d, s, slot, next, viewAs, go }: { d: TournamentData; s: LeagueState; slot: number; next?: Tie | undefined; viewAs?: number | undefined; go: (p: { tab?: Tab; tie?: number }) => void }) {
  const team = d.slots[slot] ?? null;
  return <div className="lg-team-home">
    <section className="lg-welcome">
      {team?.logo_path && <img className="lg-welcome-bg" src={team.logo_path} alt="" aria-hidden />}
      <div className="lg-welcome-top"><TeamLogo team={team} size={44} />{!viewAs && <Button variant="ghost" size="icon" aria-label="Sign out" title="Sign out" onClick={logout}><LogOut size={18} /></Button>}</div>
      <p className="lg-welcome-kicker">Welcome,</p>
      <h1>{teamName(d, slot)}</h1>
      <p className="lg-welcome-next">{next ? <>Next up: <b>{roundName(roundOf(next.id))} vs {teamName(d, opponentOf(next, slot))}</b>{lockAt(s, next).getTime() > Date.now() && <><br />Lock in by {fmtLock(lockAt(s, next))}</>}</> : 'No line-up to set right now.'}</p>
      <Button size="lg" className="lg-welcome-cta" onClick={() => go({ tab: 'fixtures' })}><ClipboardList size={18} /> Set my team lineups <ChevronRight size={18} /></Button>
    </section>
    <Button variant="outline" className="lg-home-option" onClick={() => go({ tab: 'squad' })}><span className="lg-home-icon"><Users size={20} /></span><span><b>See my squad</b><small>Your players and their levels</small></span><ChevronRight size={18} /></Button>
    <Button variant="outline" className="lg-home-option" asChild><a href={`${leagueLinks.resolve('/results')}?tab=tables`} target="_blank" rel="noopener noreferrer"><span className="lg-home-icon"><ArrowUpRight size={20} /></span><span><b>View Results &amp; Table</b><small>Opens the public results and standings</small></span><ChevronRight size={18} /></a></Button>
  </div>;
}
