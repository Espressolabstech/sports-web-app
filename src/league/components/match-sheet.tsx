import { useState } from 'react';
import { useServerFn } from '@league/lib/server-fn';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Minus, MoreHorizontal, Plus } from 'lucide-react';
import { Button } from '@league/ui/button';
import { Input } from '@league/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@league/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@league/ui/dropdown-menu';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@league/ui/alert-dialog';
import type { TournamentData } from '@league/hooks/use-tournament';
import { finalScores, formatLabel, isValidFinal, maxScore, type Discipline, type Match, type Outcome, type Tie } from '@league/lib/tournament';
import { saveMatchScore } from '@league/lib/tournament.functions';

const teamName = (d: TournamentData, slot: number | null) => slot == null ? 'TBD' : d.slots[slot]?.name ?? `Slot ${slot}`;

/** Score entry sheet. Confirmed results are final in the scorer; `override` is the Management correction flow with a reviewed confirmation. */
function Counter({ label, value, set, max }: { label: string; value: number; set: (n: number) => void; max: number }) {
  return <div className="tn-counter">
    <span>{label}</span>
    <strong aria-live="polite">{value}</strong>
    <div><Button variant="outline" aria-label={`${label} minus one`} onClick={() => set(Math.max(0, value - 1))}><Minus /></Button>
      <Button aria-label={`${label} plus one`} onClick={() => set(Math.min(max, value + 1))}><Plus /></Button></div>
  </div>;
}

export function MatchSheet({ tie, d, disc, match, close, override = false }: { tie: Tie; d: TournamentData; disc: Discipline | null; match?: Match | undefined; close: () => void; override?: boolean }) {
  const [pending, setPending] = useState<{ done: boolean; outcome?: Outcome; winner?: 'a' | 'b' } | null>(null);
  const [reason, setReason] = useState('');
  const [a, setA] = useState(match?.score_a ?? 0); const [b, setB] = useState(match?.score_b ?? 0);
  const [quickWinner, setQuickWinner] = useState<'a' | 'b'>(match && match.score_b > match.score_a ? 'b' : 'a');
  const [exception, setException] = useState<'wo' | 'ret' | null>(null);
  const [exceptionWinner, setExceptionWinner] = useState<'a' | 'b' | null>(null);
  const [tbA, setTbA] = useState(match?.tb_a != null ? String(match.tb_a) : ''); const [tbB, setTbB] = useState(match?.tb_b != null ? String(match.tb_b) : '');
  const save = useServerFn(saveMatchScore);
  type Req = { done: boolean; outcome?: Outcome; winner?: 'a' | 'b' };
  const mut = useMutation({
    mutationFn: (r: Req) => { const tb = tbA !== '' && tbB !== '' ? { tbA: Number(tbA), tbB: Number(tbB) } : { tbA: null, tbB: null };
      if (!disc) throw new Error('Select a match first');
      return save({ data: { tieId: tie.id, discipline: disc.key, a, b, done: r.done, outcome: r.outcome ?? 'score', winner: r.winner ?? null, ...tb } }); },
    onSuccess: (res, r) => { d.applyScore?.(res.match, res.tie); setPending(null); toast.success(override ? 'Score corrected' : res.crossCreated ? 'Saved — crossover ties are now set' : r.done ? 'Result saved' : 'Score saved'); if (r.done) close(); if (res.crossCreated) void d.reload?.(); },
    onError: e => toast.error(e instanceof Error ? e.message : 'Could not save — try again'),
  });
  if (!disc) return null;
  const submit = (r: { done: boolean; outcome?: Outcome; winner?: 'a' | 'b' }) => override ? setPending(r) : mut.mutate(r);
  const fmt = (m: { done: boolean; outcome?: Outcome | undefined; winner?: 'a' | 'b' | null | undefined }, sa: number, sb: number) => m.outcome === 'wo' || m.outcome === 'ret' ? `${m.outcome === 'wo' ? 'Walkover' : 'Retirement'} · ${teamName(d, m.winner === 'a' ? tie.slot_a : tie.slot_b)} won` : `${sa}–${sb}`;
  const max = maxScore(tie.stage, disc.key, d.settings);
  const final = isValidFinal(tie.stage, disc.key, a, b, d.settings);
  const winner = final ? (a > b ? teamName(d, tie.slot_a) : teamName(d, tie.slot_b)) : null;
  const chips = finalScores(tie.stage, disc.key, d.settings);
  const isPadel = disc.sport === 'Padel';
  const tbScore = isPadel && Math.max(a, b) > Math.min(a, b) && Math.max(a, b) === max && d.settings.padelTb === '5-5' && Math.min(a, b) === max - 1;
  return <Sheet open onOpenChange={o => { if (!o) close(); }}>
    <SheetContent side="bottom" className="pp-console tn-sheet">
      <SheetHeader className="tn-entry-header"><SheetTitle>{override && <span className="pp-status pp-status-warning">Score correction</span>} {disc.sport} · {disc.name}</SheetTitle><p className="text-sm text-muted-foreground">{formatLabel(tie.stage, disc.key, d.settings)} · win = {disc.points} pts</p>
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="tn-more-results" aria-label="Additional match actions" title="Additional match actions" disabled={mut.isPending}><MoreHorizontal size={20} /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="pp-console tn-result-menu">
            <DropdownMenuItem onSelect={() => { setException('wo'); setExceptionWinner(null); }}>Walkover</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => { setException('ret'); setExceptionWinner(null); }}>Retirement</DropdownMenuItem>
          </DropdownMenuContent></DropdownMenu>
      </SheetHeader>
      {match?.done && (match.outcome === 'ret' || match.outcome === 'wo') && !exception && <div className="tn-saved-outcome"><strong>{teamName(d, match.winner === 'a' ? tie.slot_a : tie.slot_b)} won</strong><span>{match.outcome === 'ret' ? 'Retirement' : 'Walkover'}</span></div>}
      {exception ? <section className="tn-exception" aria-label={`${exception === 'wo' ? 'Walkover' : 'Retirement'} result`}>
        <h3>{exception === 'wo' ? 'Walkover' : 'Retirement'}</h3><p>Winning team</p>
        <div className="tn-winner-choice">{(['a', 'b'] as const).map(w => <Button key={w} variant="outline" aria-pressed={exceptionWinner === w} onClick={() => setExceptionWinner(w)}>{teamName(d, w === 'a' ? tie.slot_a : tie.slot_b)}</Button>)}</div>
        <div className="tn-sheet-actions"><Button variant="outline" disabled={mut.isPending} onClick={() => setException(null)}>Cancel</Button><Button disabled={!exceptionWinner || mut.isPending} onClick={() => { if (exceptionWinner) submit({ done: true, outcome: exception, winner: exceptionWinner }); }}>{mut.isPending ? 'Saving…' : 'Confirm result'}</Button></div>
      </section> : <>
      <div className="tn-counters"><Counter label={teamName(d, tie.slot_a)} value={a} set={setA} max={max} /><Counter label={teamName(d, tie.slot_b)} value={b} set={setB} max={max} /></div>
      <section className="tn-final-picker" aria-label="Quick final score"><h3>Quick final score</h3>
        <div className="tn-winner-choice" role="group" aria-label="Quick score winning team">{(['a', 'b'] as const).map(w => <Button key={w} variant="outline" aria-pressed={quickWinner === w} onClick={() => setQuickWinner(w)}>{teamName(d, w === 'a' ? tie.slot_a : tie.slot_b)} wins</Button>)}</div>
        <div className="tn-final-grid">{chips.map(([w, l]) => { const sa = quickWinner === 'a' ? w : l, sb = quickWinner === 'a' ? l : w; return <Button key={`${w}-${l}`} variant="outline" aria-pressed={a === sa && b === sb} onClick={() => { setA(sa); setB(sb); }}>{sa}–{sb}</Button>; })}</div>
      </section>
      {isPadel && (tbScore || tbA !== '') && <div className="tn-quick"><span>Tie-break points (optional)</span>
        <div><Input aria-label="Tie-break points team A" inputMode="numeric" className="w-20" value={tbA} onChange={e => setTbA(e.target.value.replace(/\D/g, '').slice(0, 2))} />
          <Input aria-label="Tie-break points team B" inputMode="numeric" className="w-20" value={tbB} onChange={e => setTbB(e.target.value.replace(/\D/g, '').slice(0, 2))} /></div></div>}
      <div className="tn-sheet-actions">
        {override ? <Button variant="outline" disabled={mut.isPending} onClick={close}>Cancel</Button> : <Button variant="outline" disabled={mut.isPending} onClick={() => mut.mutate({ done: false })}>Save score</Button>}
        <Button disabled={!final || mut.isPending} onClick={() => submit({ done: true })}>{mut.isPending ? 'Saving…' : !winner ? 'Enter a final score' : override ? 'Review correction' : 'Confirm result'}</Button>
      </div>
      </>}
      {override && match?.done && <p className="text-sm text-muted-foreground">Recorded result: <strong>{fmt({ done: true, outcome: match.outcome, winner: match.winner }, match.score_a, match.score_b)}</strong></p>}
      <AlertDialog open={!!pending} onOpenChange={o => { if (!o && !mut.isPending) setPending(null); }}><AlertDialogContent className="pp-console">
        <AlertDialogHeader><AlertDialogTitle>Override final score?</AlertDialogTitle>
          <AlertDialogDescription>This replaces a confirmed result and updates points and standings for everyone.</AlertDialogDescription></AlertDialogHeader>
        {pending && <dl className="tn-override-diff"><div><dt>Recorded</dt><dd>{match ? fmt({ done: true, outcome: match.outcome, winner: match.winner }, match.score_a, match.score_b) : '—'}</dd></div><div><dt>New</dt><dd>{fmt(pending, a, b)}</dd></div></dl>}
        <label className="grid gap-1 text-sm">Reason for correction<Input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Scores entered for the wrong team" aria-label="Reason for correction" /></label>
        <AlertDialogFooter><AlertDialogCancel disabled={mut.isPending}>Cancel</AlertDialogCancel>
          <Button disabled={reason.trim().length < 3 || mut.isPending} onClick={() => { if (pending) mut.mutate(pending); }}>{mut.isPending ? 'Saving…' : 'Override score'}</Button></AlertDialogFooter>
      </AlertDialogContent></AlertDialog>
      {mut.isError && <p role="alert" className="text-sm text-destructive">Not saved. Check your signal and tap again.</p>}
    </SheetContent>
  </Sheet>;
}

