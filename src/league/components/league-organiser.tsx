import { useState } from 'react';
import { ArrowUpRight, Lock } from 'lucide-react';
import { TeamLogo } from '@league/components/auction-ui';
import { Button } from '@league/ui/button';
import { Input } from '@league/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@league/ui/sheet';
import { LineupBuilder, LineupChip, lineupState, useNow } from '@league/components/league-ui';
import { SquadGrid } from '@league/components/league-squad';
import { ManageRound } from '@league/components/round-management';
import type { TournamentData } from '@league/hooks/use-tournament';
import { isOpen, lineupOf, setLogin, useLeague } from '@league/lib/league-store';
import { ROUND_ORDER, roundName, roundOf, teamCode, type RoundKey, type Tie } from '@league/lib/tournament';
const tName = (d: TournamentData, slot: number | null) => slot == null ? 'TBD' : d.slots[slot]?.name ?? `Team ${teamCode(slot)}`;

export function LeagueOrganiser({ d }: { d: TournamentData }) {
  const s = useLeague(); const now = useNow();
  const [round, setRound] = useState<RoundKey>(1);
  const [open, setOpen] = useState<number | null>(null);
  const ties = d.ties.filter(t => roundOf(t.id) === round);
  const tie = d.ties.find(t => t.id === open);
  const deadline = s.roundLocks[round];
  return <section className="lg-grid lg-organiser" aria-label="Round line-ups">
    <div className="tn-round-chips" role="group" aria-label="Management round">{ROUND_ORDER.map(r => <Button key={r} variant="ghost" size="sm" aria-pressed={round === r} onClick={() => setRound(r)}>{r === 'SF' ? 'SF' : r === 'F' ? 'Final' : `R${r}`}</Button>)}</div>
    <header className="tn-management-round-head"><div><h2>{roundName(round)}</h2><span><Lock size={13} />{deadline ? `Lock-in: ${new Date(deadline).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })} IST` : 'Lock-in not set'}</span></div><ManageRound round={round} d={d} /></header>
    <div className="tn-management-ties">{ties.map(t => <article key={t.id} className="tn-management-tie">
      <header><h3>{t.label}</h3><Button size="sm" variant="ghost" disabled={!isOpen(t)} onClick={() => setOpen(t.id)} aria-label={`Manage Tie ${t.label}`}><span>Manage Tie</span><ArrowUpRight size={16} /></Button></header>
      {([t.slot_a, t.slot_b] as const).map((n, i) => <div key={i} className="tn-management-team"><TeamLogo team={n != null ? d.slots[n] : null} size={28} /><strong>{tName(d, n)}</strong>{n != null ? <LineupChip state={lineupState(s, t, n, now || Date.now())} /> : <span className="pp-status pp-status-neutral">TBD</span>}</div>)}
    </article>)}</div>
    {!d.loaded && <p className="tn-empty" role="status">Loading matchups…</p>}
    {d.loaded && !ties.length && <p className="tn-empty">No matchups in this round yet.</p>}
    {tie && <TieManager key={tie.id} d={d} tie={tie} open close={() => setOpen(null)} />}
  </section>;
}

/** Team access lives beside group membership, without a separate duplicate team list. */
export function TeamLoginFields({ slot, name }: { slot: number; name: string }) {
  const s = useLeague();
  return <div className="lg-login-fields">
    <label><span>Login name</span><Input aria-label={`Login name for ${name}`} placeholder="Person’s name" maxLength={100} autoComplete="name" value={s.logins[slot]?.name ?? ''} onChange={e => setLogin(slot, { ...s.logins[slot], mobile: s.logins[slot]?.mobile ?? '', name: e.target.value })} /></label>
    <label><span>Login mobile</span><Input aria-label={`Login mobile for ${name}`} placeholder="10-digit mobile number" autoComplete="tel" inputMode="numeric" value={s.logins[slot]?.mobile ?? ''} onChange={e => setLogin(slot, { ...s.logins[slot], mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })} /></label>
  </div>;
}

/** Shared team/squad management from the line-up board and courtside scoring. */
export function TieManager({ d, tie, open, close }: { d: TournamentData; tie: Tie; open: boolean; close: () => void }) {
  const s = useLeague(); const now = useNow();
  const [side, setSide] = useState<'a' | 'b'>('a');
  const [tab, setTab] = useState<'squad' | 'lineup'>('lineup');
  const slot = side === 'a' ? tie.slot_a : tie.slot_b;
  return <Sheet open={open} onOpenChange={o => { if (!o) close(); }}>
      <SheetContent side="right" className="pp-console lg-manage lg-manage-workspace">
        {tie && <><SheetHeader><SheetTitle>{tName(d, tie.slot_a)} v {tName(d, tie.slot_b)}</SheetTitle><SheetDescription>{tie.label}</SheetDescription></SheetHeader>
          <div className="auction-seg lg-manage-teams" role="group" aria-label="Matchup team">{(['a', 'b'] as const).map(v => <Button key={v} variant="ghost" aria-pressed={side === v} onClick={() => setSide(v)}>{tName(d, v === 'a' ? tie.slot_a : tie.slot_b)}</Button>)}</div>
          <div className="auction-tabs lg-manage-tabs" role="tablist" aria-label="Manage matchup">{([['squad', 'Squad list'], ['lineup', 'Matchup line-up']] as const).map(([v, label]) => <Button key={v} variant="ghost" role="tab" id={`manage-${v}`} aria-controls="manage-panel" aria-selected={tab === v} onClick={() => setTab(v)}>{label}</Button>)}</div>
          <div className="lg-manage-body" id="manage-panel" role="tabpanel" aria-labelledby={`manage-${tab}`}>
            {slot != null && (tab === 'squad' ? <SquadGrid code={teamCode(slot)} profiles={s.profiles ?? {}} /> : <LineupBuilder key={`${tie.id}-${slot}-${lineupOf(s, tie.id, slot)?.updatedAt ?? ''}`} s={s} tie={tie} slot={slot} mode="organiser" now={now} />)}
          </div>
        </>}
      </SheetContent>
    </Sheet>;
}
