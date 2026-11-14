import { useEffect, useRef, useState } from "react";
import { Check, Play } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { completedWinner, shortName, type TeamMatch, type TeamTournament } from "../../../lib/team/teamTournament";
import { competitions, nextEligible, upNext, type UpNextEntry } from "../../../lib/team/teamCompetitions";
import { muted } from "./team-ui";
import { TeamKnockoutBracket } from "./TeamKnockoutBracket";
import { TeamUpNext } from "./TeamUpNext";



/** Hairline between the three matches sections — separates them without boxing anything in. */
const sectionRule = <div aria-hidden className="-mx-4 h-px bg-[hsl(var(--event-on-ink)/0.16)]" />;
/** Finished matchups recede so the remaining ones stand out on a phone screen. */
const finished = "bg-[hsl(var(--event-surface-done))] text-[hsl(var(--event-on-ink-muted))] ring-1 ring-inset ring-[hsl(var(--event-on-ink)/0.06)]";

export function TeamMatchGrid({ data, root = data, courts, onScore, showCourts = false, onGenerateUpNext, onMoveUpNext, onRemoveUpNext, onStartNext, readOnly = false }: { data: TeamTournament; root?: TeamTournament; courts: number; readOnly?: boolean; onScore: (match: TeamMatch) => void; showCourts?: boolean; onGenerateUpNext?: () => void; onMoveUpNext?: (entry: UpNextEntry, direction: -1 | 1) => void; onRemoveUpNext?: (entry: UpNextEntry) => void; onStartNext?: (court: number) => void }) {
  const [selected, setSelected] = useState(data.knockout ? "knockout" : "group-0");
  const tabStrip = useRef<HTMLDivElement>(null);
  // Jump to the knockout tab the moment the draw is made.
  const [knockoutSeen, setKnockoutSeen] = useState(data.knockout);
  if (data.knockout !== knockoutSeen) { setKnockoutSeen(data.knockout); if (data.knockout) setSelected("knockout"); }
  useEffect(() => {
    const strip = tabStrip.current;
    const active = strip?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (strip && active) strip.scrollLeft = Math.max(0, active.offsetLeft - strip.offsetLeft - (strip.clientWidth - active.offsetWidth) / 2);
  }, [selected]);
  const tabs = [
    ...Array.from({ length: data.rules.groups }, (_, g) => ({ id: `group-${g}`, label: `Group ${g + 1}`, matches: data.matches.filter(m => m.stage === 0 && m.group === g) })),
    ...(data.knockout ? [{ id: "knockout", label: "Knockout", matches: data.matches.filter(m => m.stage > 0) }] : []),
  ];
  const current = tabs.find(t => t.id === selected) ?? tabs[0];
  if (!current) return null;
  const allMatches = competitions(root).flatMap(c => c.data.matches);
  const live = allMatches.filter(m => m.state === "active");
  const num = (m: TeamMatch) => (competitions(root).find(c => c.data.matches.includes(m))?.data.matches.indexOf(m) ?? data.matches.indexOf(m)) + 1;
  const full = (id?: string) => root.teams.find(t => t.id === id)?.players.map(p => p.name).join(" and ") ?? "Bye";
  const courtList = Array.from({ length: Math.max(courts, ...live.map(m => m.court ?? 0)) }, (_, i) => i + 1);
  const queue = upNext(root);
  const position = (m: TeamMatch) => queue.findIndex(e => e.match === m) + 1;
  const eligibleNext = nextEligible(root);
  const startNext = !readOnly && onStartNext && eligibleNext ? onStartNext : undefined;
  const names = (id: string, isWinner: boolean, small = false) => {
    const players = root.teams.find(t => t.id === id)?.players;
    if (!players) return null;
    const row = small ? "block break-words text-[10px] font-medium leading-3" : "block break-words text-[12px] font-semibold leading-4";
    const body = players.map((p, i) => <span key={i} className={row}>{shortName(p.name)}</span>);
    if (!isWinner) return <span className="w-full min-w-0 space-y-0.5">{body}</span>;
    return <span className="flex w-full min-w-0 items-start justify-center gap-1.5">
      <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--event-success))]" />
      <span className="min-w-0 space-y-0.5 text-[hsl(var(--event-success-text))]">{body}</span>
      <span aria-hidden className="w-1.5 shrink-0" />
    </span>;
  };
  const courtsShown = live.length > 0 || showCourts;
  return <div className="space-y-4">
    {courtsShown && <section aria-label="Live courts" className="-mx-1 space-y-3 px-1">
      <p className="flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.16em]"><span className="relative flex h-2 w-2"><span className="absolute inset-0 motion-safe:animate-ping rounded-full bg-[hsl(var(--event-success))] opacity-70" /><span className="relative h-2 w-2 rounded-full bg-[hsl(var(--event-success))]" /></span>On court now</p>
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[radial-gradient(120%_80%_at_50%_0%,hsl(var(--event-success)/0.18),transparent_70%)] px-1 pb-2 pt-3">
        {courtList.map(c => {
          const m = live.find(x => x.court === c);
          return <div key={c} className="relative flex flex-col items-center gap-2.5 overflow-hidden rounded-xl border border-[hsl(var(--event-success)/0.35)] bg-[hsl(var(--event-success)/0.07)] px-2 pb-7 pt-2.5">
            <span className="relative text-[11px] font-bold uppercase leading-none tracking-[0.16em] text-[hsl(var(--event-success))]">Court {c}</span>
            {m ? <Button key={`${m.a}-${m.id}`} variant="event" disabled={readOnly} aria-label={`Court ${c}: match M${num(m)}, ${full(m.a)} versus ${full(m.b)}${readOnly ? "" : ", tap to enter score"}`} onClick={() => onScore(m)} className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-6 motion-safe:duration-700 disabled:opacity-100 relative h-auto min-h-36 w-[82%] flex-col justify-between gap-1.5 whitespace-normal rounded-lg p-2 text-center shadow-[0_8px_24px_-10px_hsl(var(--event-success)/0.6)]">
              <span className="text-[11px]"><span className={`font-semibold ${muted}`}>M{num(m)}</span></span>
              {names(m.a, false)}
              <span aria-hidden className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-2 text-[9px] uppercase tracking-[0.14em] text-[hsl(var(--event-success)/0.75)]"><span className="h-px flex-1 bg-[hsl(var(--event-success)/0.3)]" />vs<span className="h-px flex-1 bg-[hsl(var(--event-success)/0.3)]" /></span>
              {names(m.b, false)}
            </Button> : startNext ? <Button variant="event" aria-label={`Start the next queued match on Court ${c}`} onClick={() => startNext(c)} className="relative flex min-h-36 w-[82%] flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-[hsl(var(--event-info)/0.45)] bg-transparent text-center">
              <span className={`text-[11px] ${muted}`}>Court free</span>
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[hsl(var(--event-info))]"><Play className="!h-3.5 !w-3.5" />Start next match</span>
            </Button> : <div className={`relative flex min-h-36 w-[82%] items-center justify-center rounded-lg border border-dashed border-[hsl(var(--event-on-ink)/0.18)] text-[11px] ${muted}`}>Court free</div>}
          </div>;
        })}
      </div>
    </section>}
    {courtsShown && sectionRule}
    {courtsShown && <TeamUpNext root={root} onGenerate={onGenerateUpNext} onMove={onMoveUpNext} onRemove={onRemoveUpNext} readOnly={readOnly} />}
    {courtsShown && sectionRule}
    <div ref={tabStrip} role="tablist" aria-label="Match groups" className="relative flex gap-2 overflow-x-auto pb-1">
      {tabs.map(t => <Button key={t.id} variant="eventGhost" role="tab" aria-selected={current.id === t.id} aria-controls="team-match-grid" className={`h-11 shrink-0 px-4 ${current.id === t.id ? "bg-[hsl(var(--event-on-ink)/0.12)] text-[hsl(var(--event-on-ink))] ring-1 ring-inset ring-[hsl(var(--event-on-ink)/0.16)]" : muted}`} onClick={() => setSelected(t.id)}>{t.label}</Button>)}
    </div>
    <section id="team-match-grid" role="tabpanel" aria-label={`${current.label} matches`} className={current.id === "knockout" ? "min-w-0" : "grid grid-cols-3 items-stretch gap-2"}>
      {current.id === "knockout" ? <TeamKnockoutBracket data={data} root={root} onScore={onScore} readOnly={readOnly} /> : current.matches.map(m => {
        const number = data.matches.indexOf(m) + 1;
        const canScore = Boolean(m.b);
        const winner = completedWinner(m);
        const label = data.teams.find(t => t.id === winner)?.players.map(p => p.name).join(" and ");
        const tileState = m.state === "active"
          ? "ring-2 ring-inset ring-[hsl(var(--event-success))] bg-[radial-gradient(120%_70%_at_50%_0%,hsl(var(--event-success)/0.18),transparent_75%)] shadow-[0_10px_28px_-10px_hsl(var(--event-success)/0.65)]"
            : m.state === "completed" ? finished : "";
        const badge = m.state === "active"
          ? <span className="flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full bg-[hsl(var(--event-success)/0.18)] px-1 py-px text-[7px] font-bold uppercase leading-3 tracking-[0.08em] text-[hsl(var(--event-success))]"><span className="h-1 w-1 motion-safe:animate-pulse rounded-full bg-[hsl(var(--event-success))]" />Live</span>
            : position(m) > 0
              ? <span className="shrink-0 whitespace-nowrap rounded-full bg-[hsl(var(--event-info)/0.18)] px-1.5 py-px text-[9px] font-bold leading-3 tabular-nums text-[hsl(var(--event-info))]">Q{position(m)}</span>
              : m.state === "completed" ? <span className={`flex shrink-0 text-[10px] ${muted}`}><Check className="!h-3 !w-3" /></span>
                : m.state === "queued" ? <span className={`flex shrink-0 text-[10px] ${muted}`}><Play className="!h-3 !w-3" /></span> : null;
        return <Button key={m.id} variant="event" disabled={readOnly || !canScore} aria-label={`M${number}: ${data.teams.find(t => t.id === m.a)?.players.map(p => p.name).join(" and ")} versus ${data.teams.find(t => t.id === m.b)?.players.map(p => p.name).join(" and ") ?? "Bye"}, ${m.state}${label ? `, won by ${label}` : ""}${canScore && !readOnly ? (m.state === "queued" ? ", tap to make live" : ", enter score") : ""}`} onClick={() => onScore(m)} className={`h-auto min-h-36 w-full flex-col justify-between gap-1.5 whitespace-normal rounded-lg p-2 text-center disabled:opacity-100 ${tileState}`}>
          <span className="flex w-full items-center justify-between gap-1 text-[11px]"><span className={`font-semibold ${muted}`}>M{number}</span>{badge}</span>
          {names(m.a, winner === m.a)}
          <span className={`flex w-full items-center gap-2 text-[9px] ${muted}`}><span className="h-px flex-1 bg-[hsl(var(--event-on-ink)/0.12)]" />vs<span className="h-px flex-1 bg-[hsl(var(--event-on-ink)/0.12)]" /></span>
          {m.b ? names(m.b, winner === m.b) : <span className="w-full min-w-0 space-y-0.5">Bye</span>}
          {m.sets.length > 0 && <span className="text-[11px] font-semibold tabular-nums">{m.sets.map(s => `${s.a}–${s.b}`).join(" · ")}</span>}
        </Button>;
      })}
    </section>
    {current.matches.length === 0 && <p className={`py-8 text-center text-sm ${muted}`}>No matchups yet</p>}
  </div>;
}
