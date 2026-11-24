import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, Check, Clock, Info, Loader2, Lock, Pencil, Sparkles } from 'lucide-react';
import { Button } from '@league/ui/button';
import { Input } from '@league/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@league/ui/popover';
import { PlayerPicker, PlayerLevels } from '@league/components/league-player-picker';
import { canStillComplete, emptyLineup, filledCount, interRule, isComplete, SPOTS, unusedPlayers, validate, type LeaguePlayer, type Lineup, type Sport } from '@league/lib/lineup-rules';
import { squadFor } from '@league/lib/league-squads';
import { isLocked, isOpen, lineupOf, organiserSave, part1Of, replacePlayer, saveTeamLineup, type LeagueState, type LineupRec } from '@league/lib/league-store';
import { teamCode, type Tie } from '@league/lib/tournament';

/** Current time, ticking after hydration (0 during SSR to avoid mismatches). */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(0);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}
/** Mobile + OTP sign-in. `check` sends the OTP (returns an error message or null); `onDone` verifies it. */
export function DummyLogin({ title, hint, check, onDone, footer }: { title: string; hint: string; check: (mobile: string) => Promise<string | null> | string | null; onDone: (mobile: string, otp: string) => Promise<string | null> | void; footer?: ReactNode }) {
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [mobile, setMobile] = useState(''); const [otp, setOtp] = useState(''); const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return <section className="tn-gate lg-login" aria-labelledby="lg-login-title">
    <h2 id="lg-login-title">{title}</h2>
    {step === 'mobile' ? <>
      <p>{hint}</p>
      <form onSubmit={async e => { e.preventDefault(); const m = mobile.replace(/\D/g, ''); if (m.length !== 10) { setErr('Enter a 10-digit mobile number'); return; } setBusy(true); const c = await check(m); setBusy(false); if (c) { setErr(c); return; } setErr(null); setStep('otp'); }}>
        <Input aria-label="Mobile number" inputMode="numeric" autoComplete="tel" placeholder="10-digit mobile" value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} />
        <Button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send OTP'}</Button>
      </form>
    </> : <>
      <p>Enter the 4-digit code sent to {mobile}.</p>
      <form onSubmit={async e => { e.preventDefault(); if (!/^\d{4}$/.test(otp)) { setErr('Enter the 4-digit code'); return; } setBusy(true); const r = await onDone(mobile.replace(/\D/g, ''), otp); setBusy(false); if (r) setErr(r); }}>
        <Input aria-label="OTP code" inputMode="numeric" autoComplete="one-time-code" placeholder="4-digit code" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))} autoFocus />
        <Button type="submit" disabled={busy}>{busy ? 'Checking…' : 'Verify and sign in'}</Button>
      </form>
      <Button variant="ghost" onClick={() => { setStep('mobile'); setOtp(''); setErr(null); }}>Change number</Button>
    </>}
    {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
    {footer}
  </section>;
}

export type LineupState = 'closed' | 'empty' | 'progress' | 'complete' | 'confirmed' | 'locked' | 'auto' | 'changed';
export function lineupState(s: LeagueState, t: Tie, slot: number, now = Date.now()): LineupState {
  const rec = lineupOf(s, t.id, slot);
  if (!isOpen(t)) return 'closed';
  if (rec?.changedAfterLock) return 'changed';
  if (isLocked(s, t, now)) return rec?.autoFilled ? 'auto' : 'locked';
  if (!rec || filledCount(rec.spots) === 0) return 'empty';
  return isComplete(rec.spots, squadFor(teamCode(slot))) ? rec.confirmedAt ? 'confirmed' : 'complete' : 'progress';
}
const STATE: Record<LineupState, [string, string]> = {
  closed: ['Opens when opponent is known', 'pp-status-neutral'], empty: ['Not started', 'pp-status-danger'], progress: ['In progress', 'pp-status-warning'],
  complete: ['Complete', 'pp-status-success'], confirmed: ['Confirmed', 'pp-status-success'], locked: ['Locked', 'pp-status-info'], auto: ['Auto-filled', 'pp-status-warning'], changed: ['Changed after lock', 'pp-status-danger'],
};
export function LineupChip({ state, team = false }: { state: LineupState; team?: boolean }) {
  const locked = ['locked', 'auto', 'changed'].includes(state);
  const [l, c] = team ? [locked ? 'Locked in' : state === 'confirmed' ? 'Confirmed' : 'To be locked in', locked || state === 'confirmed' ? 'pp-status-success' : 'pp-status-neutral'] : STATE[state];
  return <span className={`pp-status ${c}`}>{l}</span>;
}

const sportsInOrder = (p1: Sport): Sport[] => p1 === 'Pickleball' ? ['Pickleball', 'Padel'] : ['Padel', 'Pickleball'];
const matchesOf = (sport: Sport) => [...new Set(SPOTS.filter(s => s.sport === sport).map(s => s.discipline))];
const nameOf = (squad: LeaguePlayer[], id: string | null | undefined) => id ? squad.find(p => p.id === id)?.name ?? '—' : '—';

/** Read-only line-up, grouped by Part 1 / Part 2. */
export function LineupSheet({ rec, slot, part1, compact }: { rec: LineupRec | undefined; slot: number; part1: Sport; compact?: boolean }) {
  const squad = squadFor(teamCode(slot)); const l = rec?.spots ?? emptyLineup();
  return <div className={`lg-sheet${compact ? ' is-compact' : ''}`}>{sportsInOrder(part1).map((sport, i) => <section key={sport}>
    <h4>Part {i + 1} · {sport}</h4>
    <ul>{matchesOf(sport).map(d => { const ss = SPOTS.filter(s => s.discipline === d); return <li key={d}>
      <span><b>{ss[0]!.code}</b> {ss[0]!.match}</span><strong>{ss.map(s => nameOf(squad, l[s.id])).join(' & ')}{ss.some(s => rec?.replacedSpots?.includes(s.id)) && <> <span className="pp-status pp-status-danger">Changed after lock</span></>}</strong>
    </li>; })}</ul>
  </section>)}</div>;
}

/**
 * Team picks are drafts until confirmed; confirmed squads require explicit editing.
 * Organiser mode edits a draft, shows rule warnings, and can save anyway (logged).
 */
export function LineupBuilder({ s, tie, slot, mode, now }: { s: LeagueState; tie: Tie; slot: number; mode: 'team' | 'organiser'; now: number }) {
  const squad = useMemo(() => squadFor(teamCode(slot)), [slot]);
  const rec = lineupOf(s, tie.id, slot);
  const locked = isLocked(s, tie, now || Date.now());
  const [draft, setDraft] = useState<Lineup>(rec?.spots ?? emptyLineup());
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (mode === 'team') { setDraft(rec?.spots ?? emptyLineup()); setEditing(false); } }, [rec?.updatedAt, mode]);
  const l = mode === 'team' && locked ? rec?.spots ?? emptyLineup() : draft;
  const readOnly = mode === 'team' && (locked || (!!rec?.confirmedAt && !editing));
  const warnings = validate(l, squad);
  const unused = unusedPlayers(l, squad);
  const stuck = mode === 'team' && !readOnly && filledCount(l) > 0 && !canStillComplete(l, squad);
  const change = (spotId: string, pid: string | null) => {
    const next = { ...l, [spotId]: pid };
    setDraft(next);
  };
  const teamDirty = mode === 'team' && !readOnly && JSON.stringify(draft) !== JSON.stringify(rec?.spots ?? emptyLineup());
  const confirmed = mode === 'team' && !!rec?.confirmedAt && !editing;
  const dirty = mode === 'organiser' && JSON.stringify(draft) !== JSON.stringify(rec?.spots ?? emptyLineup());
  const firstSport = part1Of(s, tie.id);
  const [activeSport, setActiveSport] = useState<Sport>(firstSport);
  useEffect(() => { setActiveSport(firstSport); }, [tie.id, firstSport]);
  return <div className="lg-builder">
    {mode === 'organiser' && <div className="lg-builder-head">
      {mode === 'organiser' && <span><b>{filledCount(l)}</b>/13 spots · <b>{11 - unused.length}</b>/11 players used</span>}
      <div><LineupChip state={lineupState(s, tie, slot, now || Date.now())} /></div>
    </div>}
    {mode === 'organiser' && rec?.autoFilled && <p className="lg-note"><Sparkles size={14} /> Auto-filled at the lock ({rec.autoFilled.replace(/-/g, ' ')}).</p>}
    {stuck && <p className="lg-note is-warn"><AlertTriangle size={14} /> These picks can't make a full line-up. Each sport needs a woman for its Mixed match, and only 2 players may play both sports.</p>}
    <div className={`lg-lineup-workspace${mode === 'team' ? ' is-team' : ''}`}>
      <div className="lg-lineup-matches">
        <div className="lx-sport-toolbar"><div className="auction-lot-tabs lx-sport-tabs" role="group" aria-label="Line-up sport">{sportsInOrder(firstSport).map(sport => {
          const spots = SPOTS.filter(sp => sp.sport === sport);
          return <Button key={sport} variant="outline" aria-pressed={activeSport === sport} onClick={() => setActiveSport(sport)}>{sport} <span>{spots.filter(sp => l[sp.id]).length}/{spots.length}</span></Button>;
        })}</div>{mode === 'team' && locked && <Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" aria-label="Line-up lock information" title="Line-up lock information"><Info size={18} /></Button></PopoverTrigger><PopoverContent className="pp-console lx-lock-info" align="end"><p>Only organisers can change this line-up after lock-in.</p>{rec?.autoFilled && <p>Auto-filled at lock-in ({rec.autoFilled.replace(/-/g, ' ')}).</p>}</PopoverContent></Popover>}</div>
        {sportsInOrder(firstSport).filter(sport => sport === activeSport).map(sport => <section key={sport} className="lg-part lx-matches">
          {matchesOf(sport).map(d => { const ss = SPOTS.filter(x => x.discipline === d); const match = ss[0]; if (!match) return null;
            return <div key={d} className="lx-match">
              <div className="lx-match-head"><strong className="lx-code">{match.code}</strong><span>{match.match}</span><span className="pp-status pp-status-neutral">{match.points} pts</span></div>
              {match.need === 'inter' && <p className="lx-match-rule">{interRule(sport)}</p>}
              <div className="lx-match-spots">{ss.map(sp => <PlayerPicker key={sp.id} spot={sp} squad={squad} lineup={l} organiser={mode === 'organiser'} readOnly={readOnly} replace={mode === 'organiser' && locked && !!rec?.spots[sp.id]}
                onChange={pid => { if (mode === 'organiser' && locked && rec?.spots[sp.id] && pid) { replacePlayer(tie, slot, sp.id, pid); setDraft({ ...l, [sp.id]: pid }); } else change(sp.id, pid); }} />)}</div>
            </div>;
          })}
        </section>)}
        {!unused.length && <p className="lg-note"><Check size={14} /> Every player is used.</p>}
      </div>
    </div>
    {mode === 'team' && !locked && <div className="lg-team-confirm">
      <p className="lg-note" role="status">{confirmed ? <><Check size={14} /> Squad confirmed</> : teamDirty && rec?.confirmedAt ? <><AlertTriangle size={14} /> Unconfirmed changes</> : isComplete(draft, squad) ? 'Ready to confirm' : 'Fill every spot to confirm'}</p>
      <Button variant={confirmed ? 'outline' : 'default'} disabled={busy || (!confirmed && !isComplete(draft, squad))} onClick={() => { if (confirmed) setEditing(true); else { setBusy(true); void saveTeamLineup(tie.id, slot, draft).finally(() => { setBusy(false); setEditing(false); }); } }}>{busy ? <Loader2 size={16} className="animate-spin" /> : confirmed ? <Pencil size={16} /> : <Check size={16} />} {busy ? 'Confirming…' : confirmed ? 'Edit squad' : rec?.confirmedAt ? 'Confirm changes' : 'Confirm squad'}</Button>
    </div>}
    {mode === 'organiser' && <div className="lg-org-save">
      {warnings.length > 0 && <ul className="lg-warnings" aria-label="Rule warnings">{warnings.map(w => <li key={w.message}><AlertTriangle size={13} />{w.message}</li>)}</ul>}
      <div className="tn-sheet-actions"><Button variant="outline" disabled={!dirty} onClick={() => setDraft(rec?.spots ?? emptyLineup())}>Discard</Button>
        <Button disabled={!dirty || busy} onClick={() => { setBusy(true); void organiserSave(tie, slot, draft, warnings.map(w => w.message)).finally(() => setBusy(false)); }}>{busy && <Loader2 size={16} className="animate-spin" />}{busy ? 'Saving…' : warnings.length ? 'Save anyway' : 'Save line-up'}</Button></div>
    </div>}
  </div>;
}

export function LockCountdown({ s, tie, now, lockAtMs }: { s: LeagueState; tie: Tie; now: number; lockAtMs: number }) {
  if (!Number.isFinite(lockAtMs) && !isLocked(s, tie, now)) return <span className="lg-countdown"><Clock size={14} /> Lock-in time not set</span>;
  if (!now) return <span className="lg-countdown"><Clock size={14} /> …</span>;
  const locked = isLocked(s, tie, now);
  const deadline = new Date(lockAtMs).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }) + ' IST';
  return <span className={`lg-countdown${locked ? ' is-locked' : lockAtMs - now < 3600_000 ? ' is-soon' : ''}`}>{locked ? <><Lock size={14} /> Locked</> : <><Clock size={14} /> Lock in by {deadline}</>}</span>;
}

/** Handoff §12: an unconfirmed line-up must be impossible to miss, next to the deadline. */
export function NotConfirmed({ s, tie, slot, now }: { s: LeagueState; tie: Tie; slot: number; now: number }) {
  if (!isOpen(tie) || isLocked(s, tie, now || Date.now()) || lineupOf(s, tie.id, slot)?.confirmedAt) return null;
  return <span className="pp-status pp-status-danger" role="status"><AlertTriangle size={12} /> Not confirmed: auto-filled at the lock</span>;
}

export function SquadList({ code, levels, namesOnly }: { code: string; levels?: boolean; namesOnly?: boolean }) {
  const squad = squadFor(code);
  return <ul className="lg-squad">{squad.map(p => <li key={p.id}><span className="lg-no">{p.no}</span><strong>{p.name}</strong>
    {!namesOnly && <span className={p.gender === 'F' ? 'lg-f' : 'lg-m'}>{p.gender === 'F' ? 'Female' : 'Male'}</span>}
    {levels && <PlayerLevels player={p} />}</li>)}</ul>;
}
