import { TeamLogo } from '@league/components/auction-ui';
import { Info, Maximize2 } from 'lucide-react';
import { Button } from '@league/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@league/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@league/ui/popover';
import type { TournamentData } from '@league/hooks/use-tournament';
import { teamCode } from '@league/lib/tournament';
import type { ServerTable } from '@league/lib/server-types';

function FullTable({ d, rows, title, highlight, top }: { d: TournamentData; rows: ServerTable[]; title: string; highlight?: number | undefined; top: number }) {
  return <Dialog>
    <DialogTrigger asChild><Button variant="outline" size="sm" className="tn-full-table-trigger" aria-label={`${title}: view full table`}><Maximize2 size={15} />Full table</Button></DialogTrigger>
    <DialogContent className="pp-console tn-full-table-dialog">
      <DialogHeader>
        <DialogTitle>{title} — full standings</DialogTitle>
        <DialogDescription>Ties and matches count completed results. Bonus points are included in total points.</DialogDescription>
      </DialogHeader>
      <div className="tn-full-table-scroll" tabIndex={0} role="region" aria-label={`${title} detailed standings`}>
        <table className="tn-full-standings">
          <caption className="sr-only">{title} with ties played and won, matches played and won, bonus points, total points and net ratio.</caption>
          <thead><tr>
            <th scope="col" rowSpan={2} className="tn-full-rank">#</th><th scope="col" rowSpan={2} className="tn-full-team">Team</th>
            <th scope="colgroup" colSpan={2}>Ties</th><th scope="colgroup" colSpan={2}>Matches</th>
            <th scope="col" rowSpan={2} title="Bonus points"><span className="tn-full-heading-long">Bonus</span><span className="tn-full-heading-short">BP</span></th>
            <th scope="col" rowSpan={2} title="Total points"><span className="tn-full-heading-long">Points</span><span className="tn-full-heading-short">Pts</span></th>
            <th scope="col" rowSpan={2} title="Net ratio"><span className="tn-full-heading-long">Net ratio</span><span className="tn-full-heading-short">NR</span></th>
          </tr><tr>
            <th scope="col" title="Ties played">P</th><th scope="col" title="Ties won">W</th><th scope="col" title="Matches played">P</th><th scope="col" title="Matches won">W</th>
          </tr></thead>
          <tbody>{rows.map((r, i) => { const bonus = r.bonus ?? 0; return <tr key={r.slot} className={[i < top ? 'is-top' : '', r.slot === highlight ? 'is-me' : ''].join(' ').trim() || undefined}>
            <td className="tn-full-rank"><span className="tn-rank">{i + 1}</span></td>
            <td className="tn-full-team"><span className="tn-team"><TeamLogo team={d.slots[r.slot]} size={24} /><b className="lg-no">{teamCode(r.slot)}</b><span>{d.slots[r.slot]?.name ?? `Slot ${r.slot}`}</span></span></td>
            <td>{r.played}</td><td>{r.tiesWon}</td><td>{r.matches}</td><td>{r.won}</td>
            <td className="tn-full-bonus">{bonus > 0 ? `+${bonus}` : '0'}</td>
            <td><strong className="tn-pts">{r.points}</strong></td>
            <td>{r.netRatio.toFixed(2)}{r.tied && <span className="pp-status pp-status-warning" title="Tied — organiser draw">Draw</span>}</td>
          </tr>; })}</tbody>
        </table>
      </div>
      <p className="tn-full-table-note">Ranked by total points, match win ratio, head-to-head, net ratio and an organiser draw. Walkovers and retirements count as completed matches; net ratio excludes them.</p>
    </DialogContent>
  </Dialog>;
}

function Table({ d, rows, title, highlight, top, expandable }: { d: TournamentData; rows: ServerTable[]; title: string; highlight?: number | undefined; top: number; expandable: boolean }) {
  return <section className="lg-grid"><div className="flex items-center justify-between gap-3"><h2 className="section-kicker">{title}</h2>
    <div className="tn-table-actions">{expandable && <FullTable d={d} rows={rows} title={title} highlight={highlight} top={top} />}
    <Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" aria-label={`${title} information`} title="Table information"><Info size={16} /></Button></PopoverTrigger>
      <PopoverContent align="end" className="pp-console max-w-[calc(100vw-2rem)] text-sm">
        <h3 className="mb-3 font-semibold">Table guide</h3>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
          <dt className="font-semibold">#</dt><dd>Position in the standings.</dd>
          <dt className="font-semibold">P</dt><dd>Individual matches completed, not ties. Includes walkovers and retirements.</dd>
          <dt className="font-semibold">W</dt><dd>Individual matches won.</dd>
          <dt className="font-semibold">Pts</dt><dd>Match points including the 10-point tie-win bonus.</dd>
          <dt className="font-semibold">NR</dt><dd>Net ratio: the average of the share of Padel games won and the share of Pickleball points won. Walkovers and retirements are excluded.</dd>
        </dl>
        <p className="mt-3 text-muted-foreground">Ranked by points, then match win ratio, head-to-head, net ratio and an organiser draw. The combined table’s top four reach the semi-finals.</p>
      </PopoverContent></Popover>
    </div></div>
    <ol className="tn-table">
      <li className="tn-table-head"><span>#</span><span>Team</span><span>P</span><span>W</span><span>Pts</span><span>NR</span></li>
      {rows.map((r, i) => <li key={r.slot} className={[i < top ? 'is-top' : '', r.slot === highlight ? 'is-me' : ''].join(' ').trim() || undefined}>
        <span className="tn-rank">{i + 1}</span><span className="tn-team"><TeamLogo team={d.slots[r.slot]} size={24} /><b className="lg-no">{teamCode(r.slot)}</b><span className="tn-team-name">{d.slots[r.slot]?.name ?? `Slot ${r.slot}`}</span></span>
        <span>{r.matches}</span><span>{r.won}</span><strong className="tn-pts">{r.points}</strong><span>{r.netRatio.toFixed(2)}{r.tied && <span className="pp-status pp-status-warning" title="Tied — organiser draw">Draw</span>}</span>
      </li>)}
    </ol></section>;
}

/** Group tables until Round 3 is final, then the combined table (both always available below). */
export function LeagueTables({ d, highlight, expandable = false }: { d: TournamentData; highlight?: number; expandable?: boolean }) {
  const groupDone = d.ties.filter(t => t.round === 'group').every(t => t.status === 'done') && d.ties.length > 0;
  const combined = <Table d={d} rows={d.tables.combined} title="Combined table" highlight={highlight} top={4} expandable={expandable} />;
  return <div className="lg-grid">
    {groupDone && combined}
    <Table d={d} rows={d.tables.group1} title="Group 1" highlight={highlight} top={4} expandable={expandable} />
    <Table d={d} rows={d.tables.group2} title="Group 2" highlight={highlight} top={4} expandable={expandable} />
    {!groupDone && combined}
    <p className="tn-note">Ranked by total match points (incl. the 10-point tie-win bonus), then win ratio (matches won ÷ played), head-to-head, net ratio (NR: share of padel games and pickleball points won) and an organiser draw. Top 4 of the combined table reach the semi-finals (1st v 4th, 2nd v 3rd).</p>
  </div>;
}
