import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@league/ui/button';
import { Calendar } from '@league/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@league/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@league/ui/popover';
import { autoFillSlots, setRoundLock, useLeague } from '@league/lib/league-store';
import { roundName, roundOf, type RoundKey } from '@league/lib/tournament';
import type { TournamentData } from '@league/hooks/use-tournament';

/** One round-wide deadline editor shared by scoring and the line-up board. */
export function ManageRound({ round, d }: { round: RoundKey; d: TournamentData }) {
  const [open, setOpen] = useState(false);
  return <><Button variant="outline" size="sm" onClick={() => setOpen(true)}><Settings2 size={16} />Manage Lock in Time</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="pp-console tn-round-dialog">
      <DialogHeader><DialogTitle>Manage {roundName(round)}</DialogTitle><DialogDescription>Squad lock-in for every matchup in this round.</DialogDescription></DialogHeader>
      {open && <RoundFields round={round} d={d} close={() => setOpen(false)} />}
    </DialogContent></Dialog></>;
}

function RoundFields({ round, d, close }: { round: RoundKey; d: TournamentData; close: () => void }) {
  const s = useLeague();
  const saved = s.roundLocks[round];
  // Read the saved deadline in IST (UTC + 5:30) and show it as a local calendar date + IST clock time.
  const ist = saved ? new Date(new Date(saved).getTime() + 330 * 60_000) : undefined;
  const initial = ist ? new Date(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) : undefined;
  const [date, setDate] = useState<Date | undefined>(initial);
  const [hour, setHour] = useState(ist ? String(((ist.getUTCHours() + 11) % 12) + 1) : '9');
  const [minute, setMinute] = useState(ist ? String(ist.getUTCMinutes()).padStart(2, '0') : '00');
  const [period, setPeriod] = useState<'AM' | 'PM'>(ist ? (ist.getUTCHours() < 12 ? 'AM' : 'PM') : 'AM');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const slots = autoFillSlots(s, d.ties.filter(t => roundOf(t.id) === round));
  const [saving, setSaving] = useState(false);
  const save = (deadline: string) => { setSaving(true); void setRoundLock(round, deadline).then(() => { toast.success(`${roundName(round)} lock-in saved`); close(); }, () => undefined).finally(() => setSaving(false)); };
  return <div className="tn-round-fields">
    <div className="tn-round-field"><span>Lock-in date</span><Popover open={calendarOpen} onOpenChange={setCalendarOpen}><PopoverTrigger asChild>
      <Button variant="outline" className="tn-round-date" disabled={!!pending}><CalendarIcon size={16} />{date ? format(date, 'EEE, d MMM yyyy') : 'Select date'}</Button>
    </PopoverTrigger><PopoverContent align="start" className="pp-console w-auto p-0"><Calendar mode="single" selected={date} defaultMonth={date ?? new Date()} onSelect={d => { setDate(d); if (d) setCalendarOpen(false); }} className="p-3 pointer-events-auto" /></PopoverContent></Popover></div>
    <div className="tn-round-field"><span>Lock-in time · IST (Asia/Kolkata)</span><div className="tn-round-time">
      <select disabled={!!pending} aria-label="Lock-in hour" value={hour} onChange={e => setHour(e.target.value)}>{Array.from({ length: 12 }, (_, n) => String(n + 1)).map(v => <option key={v} value={v}>{v}</option>)}</select>
      <span aria-hidden="true">:</span><select disabled={!!pending} aria-label="Lock-in minute" value={minute} onChange={e => setMinute(e.target.value)}>{Array.from({ length: 60 }, (_, n) => String(n).padStart(2, '0')).map(v => <option key={v} value={v}>{v}</option>)}</select>
      <select disabled={!!pending} aria-label="AM or PM" value={period} onChange={e => setPeriod(e.target.value as 'AM' | 'PM')}><option value="AM">AM</option><option value="PM">PM</option></select>
    </div></div>
    {pending ? <div role="alert" className="tn-autofill-warning"><strong>Squads will be auto-filled for the following teams.</strong><ul>{slots.map(slot => <li key={slot}>{d.slots[slot]?.name ?? `Team ${slot}`}</li>)}</ul><div className="tn-round-save"><Button variant="outline" onClick={() => setPending(null)}>Go back</Button><Button disabled={saving} onClick={() => save(pending)}>{saving ? 'Saving…' : 'Confirm lock-in'}</Button></div></div> : <div className="tn-round-save"><Button variant="outline" onClick={close}>Cancel</Button><Button disabled={!date || saving} onClick={() => { if (!date) return; const h = (Number(hour) % 12) + (period === 'PM' ? 12 : 0); const deadline = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), h, Number(minute)) - 330 * 60_000); if (deadline.getTime() <= Date.now() && slots.length) setPending(deadline.toISOString()); else save(deadline.toISOString()); }}>{saving ? 'Saving…' : 'Save lock-in'}</Button></div>}
  </div>;
}