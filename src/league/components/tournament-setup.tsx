import { useEffect, useState } from 'react';
import { GitBranch, Pencil, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@league/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@league/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@league/ui/alert-dialog';
import type { TournamentData } from '@league/hooks/use-tournament';
import { ALL_SLOTS, roundName, roundOf, slotLabel, teamCode } from '@league/lib/tournament';
import { groupAssignmentSchema, stageStatus } from '@league/lib/league-management';
import { saveDemoGroups, saveDemoPair, saveLogins, unsavedLogins, useLeague } from '@league/lib/league-store';
import { TeamLoginFields } from '@league/components/league-organiser';
import { TeamLogo } from '@league/components/auction-ui';

/** Front-end handoff: automatic progression is the default; edits are explicit, confirmed overrides. */
export function TournamentSetup({ d, section }: { d: TournamentData; section: 'groups' | 'rounds' }) {
  const [teamSection, setTeamSection] = useState<'groups' | 'access'>('groups');
  const [savingLogins, setSavingLogins] = useState(false);
  useLeague(); // re-render as login fields change (the unsaved count)
  const [editingGroups, setEditingGroups] = useState(false);
  const [confirmGroups, setConfirmGroups] = useState(false);
  const [groups, setGroups] = useState<Record<string, number>>({});
  const [stage, setStage] = useState<'cross' | 'semi' | 'final' | null>(null);
  const [pairs, setPairs] = useState<Record<number, { a: number; b: number }>>({});
  const [confirmPairs, setConfirmPairs] = useState(false);
  const assigned = Object.fromEntries(Object.entries(d.slots).map(([slot, t]) => [t.id, Number(slot)]));
  const hasGroups = Object.keys(assigned).length > 0;
  const groupKey = JSON.stringify(assigned);
  useEffect(() => { if (!editingGroups) setGroups(JSON.parse(groupKey) as Record<string, number>); }, [groupKey, editingGroups]);
  const rows = d.ties.filter(t => stage === 'cross' ? t.round === 'cross' : t.stage === stage);
  const label = stage === 'cross' ? 'Rounds 4–5' : stage === 'semi' ? 'Semi-finals' : 'Final';
  const openStage = (next: 'cross' | 'semi' | 'final') => {
    setStage(next); setConfirmPairs(false);
    setPairs(Object.fromEntries(d.ties.filter(t => next === 'cross' ? t.round === 'cross' : t.stage === next).map(t => [t.id, { a: t.slot_a ?? 0, b: t.slot_b ?? 0 }])));
  };
  const changeGroup = (teamId: string, slot: number) => {
    const previous = groups[teamId]; const other = Object.keys(groups).find(id => id !== teamId && groups[id] === slot);
    setGroups({ ...groups, [teamId]: slot, ...(other ? { [other]: previous ?? 0 } : {}) });
  };
  const [saving, setSaving] = useState(false);
  const saveGroups = () => { setSaving(true); void saveDemoGroups(groups, hasGroups).then(() => { setEditingGroups(false); setConfirmGroups(false); toast.success(hasGroups ? 'Groups saved — league flow reset' : 'Team groups saved'); }, () => undefined).finally(() => setSaving(false)); };
  const pairValid = rows.length > 0 && rows.every(t => { const p = pairs[t.id]; return p && ALL_SLOTS.includes(p.a) && ALL_SLOTS.includes(p.b) && p.a !== p.b; });
  return <section className="tn-setup" aria-label={section === 'groups' ? 'Teams and access' : 'Manage Matchups'}>
    {section === 'groups' ? <section className="tn-setup-section" aria-labelledby="tn-groups-title">
      <div className="auction-seg tn-team-sections" role="group" aria-label="Team management sections"><Button variant="ghost" aria-pressed={teamSection === 'groups'} onClick={() => setTeamSection('groups')}>Groups</Button><Button variant="ghost" disabled={editingGroups} aria-pressed={teamSection === 'access'} onClick={() => setTeamSection('access')}>Team access</Button></div>
      <header><Users size={19} /><div><h3 id="tn-groups-title">{teamSection === 'groups' ? 'Group allocation' : 'Team access'}</h3></div>{teamSection === 'groups' && hasGroups && !editingGroups && <Button variant="outline" size="sm" onClick={() => setConfirmGroups(true)}><Pencil size={14} />Edit groups</Button>}</header>
      {teamSection === 'groups' ? <>
        <ul className="tn-group-allocation-list">{[...d.teams].sort((a, b) => (assigned[a.id] ?? 9) - (assigned[b.id] ?? 9)).map(t => <li key={t.id}><TeamLogo team={t} size={28} /><strong>{t.name}</strong><select disabled={hasGroups && !editingGroups} aria-label={`Group position for ${t.name}`} value={(editingGroups || !hasGroups ? groups[t.id] : assigned[t.id]) ?? ''} onChange={e => changeGroup(t.id, Number(e.target.value))}><option value="" disabled>Choose slot</option>{ALL_SLOTS.map(n => <option key={n} value={n}>Group {n <= 4 ? 1 : 2} · {teamCode(n)}</option>)}</select></li>)}</ul>
        {(editingGroups || !hasGroups) && <div className="tn-round-save tn-group-save"><Button variant="outline" onClick={() => setEditingGroups(false)}>Cancel</Button><Button disabled={saving || !groupAssignmentSchema.safeParse(groups).success || JSON.stringify(groups) === groupKey} onClick={() => hasGroups ? setConfirmGroups(true) : saveGroups()}>{saving ? 'Saving…' : 'Save groups'}</Button></div>}
      </> : <ul className="tn-slot-list tn-management-team-list">{d.teams.map(t => { const slot = assigned[t.id]; return <li key={t.id}><div className="tn-management-team-identity"><strong>{t.name}</strong></div>{slot != null ? <TeamLoginFields slot={slot} name={t.name} /> : <small>Assign a group position first</small>}</li>; })}</ul>}
      {teamSection === 'access' && <div className="tn-round-save tn-group-save"><span className="text-sm text-muted-foreground">{unsavedLogins() ? `${unsavedLogins()} team${unsavedLogins() === 1 ? '' : 's'} changed — not saved yet` : 'All team logins saved'}</span><Button disabled={!unsavedLogins() || savingLogins} onClick={() => { setSavingLogins(true); void saveLogins().finally(() => setSavingLogins(false)); }}>{savingLogins ? 'Saving…' : 'Save team access'}</Button></div>}
      <AlertDialog open={confirmGroups} onOpenChange={setConfirmGroups}><AlertDialogContent className="pp-console tn-round-dialog"><AlertDialogHeader><AlertDialogTitle>{editingGroups ? 'Confirm group changes?' : 'Edit team groups?'}</AlertDialogTitle><AlertDialogDescription>If you change anything it will reset the flow, so please confirm you want to change: scores, standings, line-ups, lock-in times and later matchups will restart because the group positions determine the whole tournament. Team login details and auction squads stay unchanged.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><Button variant={editingGroups ? 'destructive' : 'outline'} disabled={saving} onClick={() => { if (editingGroups) saveGroups(); else { setEditingGroups(true); setConfirmGroups(false); } }}>{editingGroups ? 'Confirm changes and reset' : 'Continue editing'}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </section> : <section className="tn-setup-section" aria-labelledby="tn-matchups-title">
      <header><GitBranch size={19} /><div><h3 id="tn-matchups-title">Manage Matchups</h3></div><span className="pp-status pp-status-neutral">Auto-fill</span></header>
      <div className="tn-stage-list"><div className="tn-stage-head"><span>Stage</span><span>Status</span><span /></div>{([['cross', 'Rounds 4–5'], ['semi', 'Semi-finals'], ['final', 'Final']] as const).map(([key, text]) => <div className="tn-stage-row" key={key}><strong>{text}</strong><span>{stageStatus(key, d.ties, d.matches)}</span><Button variant="ghost" size="sm" onClick={() => openStage(key)}>Edit</Button></div>)}</div>
      <Dialog open={!!stage} onOpenChange={o => { if (!o) setStage(null); }}><DialogContent className="pp-console tn-round-dialog tn-matchups-dialog"><DialogHeader><DialogTitle>Edit {label}</DialogTitle><DialogDescription>{confirmPairs ? 'Confirm these teams? This overrides the automatic pairings and clears scores and line-ups for changed matchups.' : 'Automatic pairings are shown below. Change teams only if needed.'}</DialogDescription></DialogHeader>
        <div className="tn-matchup-edit-list">{rows.map(t => { const pair = pairs[t.id]; return <div className="tn-matchup-edit-row" key={t.id}><strong>{roundName(roundOf(t.id))} · {t.label}</strong>{(['a', 'b'] as const).map(side => confirmPairs ? <span key={side}>{d.slots[pair?.[side] ?? 0]?.name ?? 'TBD'}</span> : <select key={side} aria-label={`${t.label} team ${side.toUpperCase()}`} value={pair?.[side] ?? 0} onChange={e => setPairs({ ...pairs, [t.id]: { a: pair?.a ?? 0, b: pair?.b ?? 0, [side]: Number(e.target.value) } })}><option value={0} disabled>TBD</option>{ALL_SLOTS.map(slot => <option key={slot} value={slot}>{d.slots[slot]?.name ?? slotLabel(slot)}</option>)}</select>)}</div>; })}</div>
        <div className="tn-round-save"><Button variant="outline" onClick={() => confirmPairs ? setConfirmPairs(false) : setStage(null)}>{confirmPairs ? 'Go back' : 'Cancel'}</Button><Button disabled={!pairValid || saving} onClick={() => { if (!confirmPairs) { setConfirmPairs(true); return; } setSaving(true); void (async () => { try { for (const t of rows) { const p = pairs[t.id]; if (p && (t.slot_a !== p.a || t.slot_b !== p.b)) await saveDemoPair(t.id, p.a, p.b); } toast.success(`${label} matchups saved`); setStage(null); } catch { /* the error was shown */ } finally { setSaving(false); } })(); }}>{saving ? 'Saving…' : confirmPairs ? 'Confirm changes' : 'Review changes'}</Button></div>
      </DialogContent></Dialog>
    </section>}
  </section>;
}
