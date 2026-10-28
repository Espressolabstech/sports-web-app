import { Check, Trophy } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { completedWinner, type TeamMatch, type TeamTournament } from "../../../lib/team/teamTournament";
import { upNext } from "../../../lib/team/teamCompetitions";
import { knockoutBracket } from "./knockout-bracket";
import { muted } from "./team-ui";

const cardHeight = 144;
const rowHeight = 164;
const columnWidth = 160;
const gutter = 28;

export function TeamKnockoutBracket({ data, root, onScore, readOnly = false }: { readOnly?: boolean; data: TeamTournament; root: TeamTournament; onScore: (match: TeamMatch) => void }) {
  const rounds = knockoutBracket(data);
  const height = (rounds[0]?.slots.length ?? 0) * rowHeight;
  if (!rounds.length) return null;
  const teamName = (id?: string) => root.teams.find(t => t.id === id);
  return <div tabIndex={0} role="region" aria-label="Knockout bracket" className="overflow-x-auto pb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--event-accent))]">
    <div className="flex w-max pr-1">
      {rounds.map((round, roundIndex) => <section key={round.stage} aria-label={round.label} className="shrink-0" style={{ width: columnWidth + (roundIndex === rounds.length - 1 ? 0 : gutter) }}>
        <h3 className={`mb-4 flex h-6 items-center gap-1.5 text-xs font-medium ${muted}`}>{round.label === "Final" && <Trophy className="h-3.5 w-3.5" />}{round.label}</h3>
        <div className="relative" style={{ height }}>
          {round.slots.map((slot, index) => {
            const spacing = rowHeight * 2 ** roundIndex;
            const center = spacing * (index + 0.5);
            const m = slot.match;
            const winner = m ? completedWinner(m) : undefined;
            const live = m?.state === "active";
            const queued = m?.state === "queued" && upNext(root).some(e => e.match === m);
            const canOpen = Boolean(m?.a && m.b);
            const finished = m?.state === "completed";
            const accessibleNames = slot.sides.map(s => teamName(s.teamId)?.players.map(p => p.name).join(" and ") ?? s.placeholder);
            return <div key={m?.id ?? `future-${index}`} className="absolute left-0" style={{ top: center - cardHeight / 2, width: columnWidth }}>
              {roundIndex < rounds.length - 1 && <svg aria-hidden className={`pointer-events-none absolute overflow-visible text-[hsl(var(--event-on-ink)/0.22)]`} style={{ left: columnWidth, top: cardHeight / 2, width: gutter, height: 1 }}>
                <path d={`M0 0 H${gutter / 2} V${index % 2 === 0 ? spacing / 2 : -spacing / 2} H${gutter}`} fill="none" stroke="currentColor" strokeWidth="1" />
              </svg>}
              <Button variant="event" disabled={readOnly || !canOpen} onClick={() => { if (m) onScore(m); }} aria-label={`M${slot.number}: ${accessibleNames.join(" versus ")}, ${m?.state ?? "awaiting qualifiers"}`} className={`relative h-36 w-full flex-col items-stretch justify-start gap-0 whitespace-normal rounded-lg border p-0 text-left disabled:opacity-100 ${live ? "border-[hsl(var(--event-success))] bg-[hsl(var(--event-success)/0.08)]" : queued ? "border-[hsl(var(--event-info)/0.6)]" : "border-[hsl(var(--event-on-ink)/0.12)]"} ${finished ? "bg-[hsl(var(--event-surface-done))]" : ""} ${!m ? "border-dashed bg-transparent" : ""}`}>
                <span className={`flex h-7 shrink-0 items-center justify-between px-2.5 text-[10px] ${muted}`}><span>M{slot.number}</span>{live ? <span className="flex items-center gap-1 text-[hsl(var(--event-success-text))]"><span className="h-1 w-1 rounded-full bg-[hsl(var(--event-success))] motion-safe:animate-pulse" />Live</span> : queued && m ? <span className="text-[hsl(var(--event-info))]">#{upNext(root).findIndex(e => e.match === m) + 1}</span> : finished ? <Check className="!h-3 !w-3" /> : null}</span>
                {slot.sides.map((side, sideIndex) => {
                  const team = teamName(side.teamId);
                  const won = Boolean(winner && winner === side.teamId);
                  return <span key={sideIndex} className={`flex min-h-0 flex-1 items-center gap-1.5 px-2.5 ${sideIndex === 1 ? "border-t border-[hsl(var(--event-on-ink)/0.1)]" : ""} ${won ? "text-[hsl(var(--event-success-text))]" : finished || !team ? muted : ""}`}>
                    <span className="min-w-0 flex-1 text-[11px] font-medium leading-4">{team ? team.players.map((player, i) => { const words = player.name.trim().split(/\s+/); return <span key={i} className="block break-words">{words.length > 1 ? `${words[0]} ${words[words.length - 1].slice(0, 1)}.` : player.name}</span>; }) : <span className="text-[10px] font-normal">{side.placeholder}</span>}</span>
                    {m && m.sets.length > 0 && <span className="flex shrink-0 gap-1.5 text-[11px] tabular-nums">{m.sets.map((set, i) => <span key={i}>{sideIndex === 0 ? set.a : set.b}</span>)}</span>}
                    {won && !m?.sets.length && <Check className="!h-3 !w-3 shrink-0" />}
                  </span>;
                })}
              </Button>
            </div>;
          })}
        </div>
      </section>)}
    </div>
  </div>;
}