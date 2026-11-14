import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronRight, ListPlus, MoreHorizontal, X } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../../components/ui/dropdown-menu";
import { competitions, upNext, type UpNextEntry } from "../../../lib/team/teamCompetitions";
import type { TeamTournament } from "../../../lib/team/teamTournament";
import { shortName } from "../../../lib/team/teamTournament";
import { TeamActionSheet } from "./TeamActionSheet";
import { muted } from "./team-ui";

export function TeamUpNext({ root, onGenerate, onMove, onRemove, readOnly = false }: {
  root: TeamTournament;
  readOnly?: boolean;
  onGenerate?: () => void;
  onMove?: (entry: UpNextEntry, direction: -1 | 1) => void;
  onRemove?: (entry: UpNextEntry) => void;
}) {
  const [open, setOpen] = useState(false);
  const queue = upNext(root);
  const list = competitions(root);
  const number = (e: UpNextEntry) => (list.find(c => c.id === e.competitionId)?.data.matches.findIndex(m => m.id === e.match.id) ?? -1) + 1;
  const remaining = list.some(c => c.data.started && c.data.matches.some(m => m.state === "queued" && m.b && m.queueOrder === undefined && m.nextOnCourt === undefined));
  const side = (id: string) => root.teams.find(t => t.id === id)?.players.map((p, i) => <span key={i} className="block break-words">{shortName(p.name)}</span>) ?? "—";
  const rows = (entries: UpNextEntry[], full = false) => <ol aria-label={full ? "Entire match queue" : "Next three matches"} className="divide-y divide-[hsl(var(--event-on-ink)/0.08)]">
    {entries.map(e => {
      const i = queue.indexOf(e), n = number(e);
      if (full) return <li key={`${e.competitionId}-${e.match.id}`} className="py-1.5">
        <div className="flex items-center gap-2">
          <div className={`w-7 shrink-0 text-center text-[11px] leading-4 tabular-nums ${muted}`}><span className="block">M{n}</span><span className="mx-auto mt-0.5 block w-5 border-t border-[hsl(var(--event-on-ink)/0.2)] pt-0.5">{e.match.stage === 0 ? `G${(e.match.group ?? 0) + 1}` : "KO"}</span></div>
          <div className="flex min-w-0 flex-1 items-center justify-center gap-3">
            <div className="min-w-0 max-w-[8.5rem] space-y-0.5 text-left text-[13px] font-medium leading-[13px]">{side(e.match.a)}</div>
            <span className={`shrink-0 text-[11px] ${muted}`}>vs</span>
            <div className="min-w-0 max-w-[8.5rem] space-y-0.5 text-right text-[13px] font-medium leading-[13px]">{e.match.b ? side(e.match.b) : "Bye"}</div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {onMove && <><Button variant="eventGhost" size="icon" className="h-11 w-9 rounded-md" disabled={i === 0} aria-label={`Move M${n} up`} title="Move up" onClick={() => onMove(e, -1)}><ArrowUp className="!h-4 !w-4" /></Button><Button variant="eventGhost" size="icon" className="h-11 w-9 rounded-md" disabled={i === queue.length - 1} aria-label={`Move M${n} down`} title="Move down" onClick={() => onMove(e, 1)}><ArrowDown className="!h-4 !w-4" /></Button></>}
            {onRemove && <Button variant="eventGhost" size="icon" className={`h-11 w-9 rounded-md ${muted}`} aria-label={`Remove M${n} from queue`} title="Remove matchup" onClick={() => onRemove(e)}><X className="!h-4 !w-4" /></Button>}
          </div>
        </div>
      </li>;
      return <li key={`${e.competitionId}-${e.match.id}`} className="py-3">
        <div className="flex items-center gap-1">
          <div className={`w-11 shrink-0 text-center text-[11px] leading-4 tabular-nums ${muted}`}><span className="block">M{n}</span><span className="mx-auto mt-1 block w-5 border-t border-[hsl(var(--event-on-ink)/0.2)] pt-1">{e.match.stage === 0 ? `G${(e.match.group ?? 0) + 1}` : "KO"}</span></div>
          <div className="flex min-w-0 flex-1 items-center justify-center gap-4">
            <div className="min-w-0 max-w-[9rem] space-y-0.5 text-left text-[13px] font-medium leading-4">{side(e.match.a)}</div>
            <span className={`shrink-0 text-[11px] ${muted}`}>vs</span>
            <div className="min-w-0 max-w-[9rem] space-y-0.5 text-right text-[13px] font-medium leading-4">{e.match.b ? side(e.match.b) : "Bye"}</div>
          </div>
          {!readOnly && (onMove || onRemove) && <DropdownMenu><DropdownMenuTrigger asChild><Button variant="eventGhost" size="icon" className="h-11 w-11 shrink-0" aria-label={`Queue actions for M${n}`}><MoreHorizontal className="!h-5 !w-5" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="z-[60] border-[hsl(var(--event-on-ink)/0.12)] bg-[hsl(var(--event-ink-soft))] text-[hsl(var(--event-on-ink))]">
            {onMove && <><DropdownMenuItem disabled={i === 0} className="min-h-11 gap-2 focus:bg-[hsl(var(--event-on-ink)/0.08)] focus:text-inherit" onSelect={() => onMove(e, -1)}><ArrowUp className="h-4 w-4" />Move up</DropdownMenuItem><DropdownMenuItem disabled={i === queue.length - 1} className="min-h-11 gap-2 focus:bg-[hsl(var(--event-on-ink)/0.08)] focus:text-inherit" onSelect={() => onMove(e, 1)}><ArrowDown className="h-4 w-4" />Move down</DropdownMenuItem></>}
            {onRemove && <DropdownMenuItem className="min-h-11 gap-2 focus:bg-[hsl(var(--event-on-ink)/0.08)] focus:text-inherit" onSelect={() => onRemove(e)}><X className="h-4 w-4" />Remove matchup</DropdownMenuItem>}
          </DropdownMenuContent></DropdownMenu>}
        </div>
      </li>;
    })}
  </ol>;
  return <section aria-label="Queue" className="space-y-2 px-1 pb-1">
    <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em]">Queue{queue.length > 0 && <span className={`ml-2 font-normal tabular-nums ${muted}`}>{readOnly ? "Next 3" : queue.length}</span>}</h2>
    {queue.length ? rows(queue.slice(0, 3)) : <p className={`py-2 text-xs ${muted}`}>No matches queued</p>}
    {!readOnly && (queue.length > 0 || onGenerate) && <div className="flex items-center gap-1 border-t border-[hsl(var(--event-on-ink)/0.08)]">
      {queue.length > 0 && <Button variant="eventGhost" className="h-11 min-w-0 flex-1 justify-between px-1 text-[13px] text-[hsl(var(--event-on-ink))]" onClick={() => setOpen(true)}><span>Full Queue<span className={`ml-1 tabular-nums ${muted}`}>· {queue.length}</span></span><ChevronRight className="!h-4 !w-4 opacity-70" /></Button>}
      {!queue.length && onGenerate && <Button variant="eventGhost" disabled={!remaining} className="h-11 gap-2 px-1 text-[13px]" onClick={onGenerate}><ListPlus className="!h-4 !w-4" />Generate Random Queue</Button>}
    </div>}
    {!readOnly && <TeamActionSheet open={open} onOpenChange={setOpen} title="Full Queue" description={`${queue.length} queued matches`} actions={onGenerate ? <Button variant="eventGhost" disabled={!remaining} aria-label="Generate Random Queue" title="Add all remaining matches in random balanced order" className="h-11 shrink-0 gap-1.5 px-2 text-[13px]" onClick={onGenerate}><ListPlus className="!h-4 !w-4" />Add remaining</Button> : undefined}>
      {queue.length ? rows(queue, true) : <p className={`py-6 text-center text-sm ${muted}`}>No matches queued</p>}
    </TeamActionSheet>}
  </section>;
}
