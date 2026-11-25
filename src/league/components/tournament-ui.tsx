import { Link, useRouter } from '@league/lib/router';
import { useServerFn } from '@league/lib/server-fn';
import { ChevronDown, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useState, type ReactNode } from 'react';
import { Button } from '@league/ui/button';
import { Input } from '@league/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@league/ui/dropdown-menu';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@league/ui/alert-dialog';
import { seedScoringForTesting, type TestingPreset } from '@league/lib/tournament.functions';
import { resetDemo, testingRoundsLocked } from '@league/lib/league-store';
import { ROUND_ORDER, type RoundKey, type Tie } from '@league/lib/tournament';
import { SiteHeader } from '@league/components/site-header';
import { leagueLinks } from '@league/lib/links';

type PreviewPreset = TestingPreset | 'r1locked' | 'r2locked' | 'r3locked';
const LOCKED: Partial<Record<PreviewPreset, number>> = { r1locked: 1, r2locked: 2, r3locked: 3 };
const PRESETS: Record<PreviewPreset, string> = { reset: 'Reset all scoring', r1locked: 'Round 1 lineups locked in', r2locked: 'Rounds 1–2 lineups locked in', r3locked: 'Rounds 1–3 lineups locked in', r3: 'Rounds 1–3 complete', r5: 'Rounds 1–5 complete', sf: 'Semi-finals complete', done: 'Tournament complete' };
const links = [['/scoring', 'Organiser'], ['/team', 'Team'], ['/results', 'Public']] as const;

export function TournamentShell({ title, children, onReset, beforeHeading, headingActions, headerActions, teamWorkspace = false, compactHeading = false, ties = [] }: { kicker: string; title: string; children: ReactNode; onReset?: () => Promise<void>; beforeHeading?: ReactNode; headingActions?: ReactNode; headerActions?: ReactNode; teamWorkspace?: boolean; compactHeading?: boolean; ties?: Tie[] }) {
  const [confirm, setConfirm] = useState<PreviewPreset | null>(null);
  const [resetting, setResetting] = useState(false);
  const reset = useServerFn(seedScoringForTesting);
  const router = useRouter();
  const runReset = async () => {
    setResetting(true);
    try { if (!confirm) return; await reset({ data: { preset: LOCKED[confirm] ? 'reset' : confirm as TestingPreset } });
      // Our server's scoring presets already lock line-ups for the rounds they play.
      if (LOCKED[confirm]) testingRoundsLocked(ties, LOCKED[confirm]); else resetDemo();
      await onReset?.(); await router.invalidate(); toast.success(confirm === 'reset' ? 'Scoring reset' : `Testing state: ${PRESETS[confirm]}`); setConfirm(null); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Could not reset scoring'); }
    finally { setResetting(false); }
  };
  useEffect(() => { document.body.classList.add('pp-console-page'); return () => document.body.classList.remove('pp-console-page'); }, []);
  const Frame = leagueLinks.frame;
  const testingMenu = <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="tn-testing" aria-label="Testing">Testing <ChevronDown size={13} /></Button></DropdownMenuTrigger><DropdownMenuContent className="pp-console tn-result-menu" align="end">{(Object.keys(PRESETS) as PreviewPreset[]).map(k => <DropdownMenuItem key={k} disabled={!!LOCKED[k] && !ties.length} onSelect={() => setConfirm(k)}>{k === 'reset' && <RotateCcw size={15} />}{PRESETS[k]}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>;
  // Inside the app: its own page frame (brand header, app tabs, title); the league screens keep the reference's layout.
  // Called as a function (not <Frame/>): the page re-creates it each render, and as a component that would remount the
  // whole league screen (losing the open tab, drafts) after every save.
  if (Frame) return Frame({ title: teamWorkspace ? "" : title, actions: <div className="tn-scope pp-console tn-heading-actions">{headingActions}{headerActions}{leagueLinks.testing && <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="tn-testing" aria-label="Testing">Testing <ChevronDown size={13} /></Button></DropdownMenuTrigger><DropdownMenuContent className="pp-console tn-result-menu" align="end">{(Object.keys(PRESETS) as PreviewPreset[]).map(k => <DropdownMenuItem key={k} disabled={!!LOCKED[k] && !ties.length} onSelect={() => setConfirm(k)}>{k === 'reset' && <RotateCcw size={15} />}{PRESETS[k]}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>}</div>, children: <>
    <div className="tn-scope pp-console tn-shell tn-embedded"><div className="tn-main">
    {leagueLinks.ownHeading && !teamWorkspace && <div className={`auction-heading tn-heading${compactHeading ? ' tn-heading-team' : ''}`}><div><h1>{title}</h1></div><div className="tn-heading-actions">{headingActions}{headerActions}{leagueLinks.testing && testingMenu}</div></div>}
    <AlertDialog open={!!confirm} onOpenChange={o => { if (!resetting && !o) setConfirm(null); }}><AlertDialogContent className="pp-console tn-reset-dialog"><AlertDialogHeader><AlertDialogTitle>{confirm === 'reset' ? 'Reset scoring?' : `Set “${confirm ? PRESETS[confirm] : ''}”?`}</AlertDialogTitle><AlertDialogDescription>{confirm === 'r1locked' ? 'Clear scoring and previous lineups, then fill and lock both teams’ lineups for all four Round 1 matchups.' : confirm === 'reset' ? 'Clear all match scores, results, standings, lineups and crossover/knockout pairings.' : 'Replace all current scores with random results up to this stage.'} Team groups stay. Auction data will not change.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={resetting}>Cancel</AlertDialogCancel><Button variant="destructive" disabled={resetting} onClick={() => void runReset()}>{resetting ? 'Working…' : confirm === 'reset' ? 'Reset scoring' : 'Apply'}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
    {beforeHeading}
    {children}
    </div></div>
  </> });
  return <div className="tn-scope pp-console tn-shell">
    {!teamWorkspace && <nav className="auction-nav tn-page-nav" aria-label="Tournament pages">{links.filter(([to]) => leagueLinks.map[to]).map(([to, label]) => <Link key={to} to={to} activeProps={{ className: 'active' }}>{label}</Link>)}
      {leagueLinks.testing && <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="tn-testing" aria-label="Testing">Testing <ChevronDown size={13} /></Button></DropdownMenuTrigger><DropdownMenuContent className="pp-console tn-result-menu" align="end">{(Object.keys(PRESETS) as PreviewPreset[]).map(k => <DropdownMenuItem key={k} disabled={!!LOCKED[k] && !ties.length} onSelect={() => setConfirm(k)}>{k === 'reset' && <RotateCcw size={15} />}{PRESETS[k]}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>}
    </nav>}
    <SiteHeader afterLogo={headerActions} />
    <main className="auction-main tn-main">
    <AlertDialog open={!!confirm} onOpenChange={o => { if (!resetting && !o) setConfirm(null); }}><AlertDialogContent className="pp-console tn-reset-dialog"><AlertDialogHeader><AlertDialogTitle>{confirm === 'reset' ? 'Reset scoring?' : `Set “${confirm ? PRESETS[confirm] : ''}”?`}</AlertDialogTitle><AlertDialogDescription>{confirm === 'r1locked' ? 'Clear scoring and previous lineups, then fill and lock both teams’ lineups for all four Round 1 matchups.' : confirm === 'reset' ? 'Clear all match scores, results, standings, lineups and crossover/knockout pairings.' : 'Replace all current scores with random results up to this stage.'} Team groups stay. Auction data will not change.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={resetting}>Cancel</AlertDialogCancel><Button variant="destructive" disabled={resetting} onClick={() => void runReset()}>{resetting ? 'Working…' : confirm === 'reset' ? 'Reset scoring' : 'Apply'}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
    {beforeHeading}
    {!teamWorkspace && <div className={`auction-heading tn-heading${compactHeading ? ' tn-heading-team' : ''}`}><div><h1>{title}</h1></div>{headingActions && <div className="tn-heading-actions">{headingActions}</div>}</div>}
    {children}
    <footer className="site-footer"><span>Copyright PlayPass</span><span>Padel Master, SBR</span></footer>
    </main>
  </div>;
}

export type RoundView = RoundKey | 'all' | 'table';
export function RoundChips({ value, onChange, includeTable = true }: { value: RoundView; onChange: (round: RoundView) => void; includeTable?: boolean }) {
  return <div className="tn-round-chips" role="group" aria-label="Round">{(['table', 'all', ...ROUND_ORDER] as const).filter(r => includeTable || r !== 'table').map(r => <Button key={String(r)} variant="ghost" size="sm" aria-pressed={value === r} onClick={() => onChange(r)}>{r === 'table' ? 'Table' : r === 'all' ? 'All' : r === 'SF' ? 'SF' : r === 'F' ? 'Final' : `R${r}`}</Button>)}</div>;
}

/** Internal-testing gate: UI only, with a bypass. Not a security boundary. */
export function ScorerGate({ children }: { children: ReactNode }) {
  const [ok, setOk] = useState(false);
  const [code, setCode] = useState('');
  useEffect(() => { setOk(sessionStorage.getItem('tcc-scorer') === '1'); }, []);
  const enter = () => { sessionStorage.setItem('tcc-scorer', '1'); setOk(true); };
  if (ok) return <>{children}</>;
  return <section className="tn-gate">
    <h2>Scorer sign-in</h2>
    <p>Enter the scorer passcode from the organisers.</p>
    <form onSubmit={e => { e.preventDefault(); enter(); }}>
      <Input aria-label="Scorer passcode" inputMode="numeric" placeholder="Passcode" value={code} onChange={e => setCode(e.target.value)} />
      <Button type="submit">Start scoring</Button>
    </form>
    <Button variant="ghost" onClick={enter}>Skip for testing</Button>
  </section>;
}
