import { TeamLogo } from '@league/components/auction-ui';
import type { TournamentData } from '@league/hooks/use-tournament';
import { teamCode } from '@league/lib/tournament';
import type { ServerTable } from '@league/lib/server-types';

function Table({ d, rows, title, highlight, top }: { d: TournamentData; rows: ServerTable[]; title: string; highlight?: number | undefined; top: number }) {
  return <section className="lg-grid"><h2 className="section-kicker">{title}</h2>
    <ol className="tn-table">
      <li className="tn-table-head"><span>#</span><span>Team</span><span>P</span><span>W</span><span>Pts</span><span>NR</span></li>
      {rows.map((r, i) => <li key={r.slot} className={[i < top ? 'is-top' : '', r.slot === highlight ? 'is-me' : ''].join(' ').trim() || undefined}>
        <span className="tn-rank">{i + 1}</span><span className="tn-team"><TeamLogo team={d.slots[r.slot]} size={24} /><b className="lg-no">{teamCode(r.slot)}</b><span className="tn-team-name">{d.slots[r.slot]?.name ?? `Slot ${r.slot}`}</span></span>
        <span>{r.played}</span><span>{r.won}</span><strong className="tn-pts">{r.points}</strong><span>{r.netRatio.toFixed(2)}{r.tied && <span className="pp-status pp-status-warning" title="Tied — organiser draw">Draw</span>}</span>
      </li>)}
    </ol></section>;
}

/** Group tables until Round 3 is final, then the combined table (both always available below). */
export function LeagueTables({ d, highlight }: { d: TournamentData; highlight?: number }) {
  const groupDone = d.ties.filter(t => t.round === 'group').every(t => t.status === 'done') && d.ties.length > 0;
  const combined = <Table d={d} rows={d.tables.combined} title="Combined table" highlight={highlight} top={4} />;
  return <div className="lg-grid">
    {groupDone && combined}
    <Table d={d} rows={d.tables.group1} title="Group 1" highlight={highlight} top={4} />
    <Table d={d} rows={d.tables.group2} title="Group 2" highlight={highlight} top={4} />
    {!groupDone && combined}
    <p className="tn-note">Ranked by total match points (incl. the 10-point tie-win bonus), then win ratio (matches won ÷ played), head-to-head, net ratio (NR: share of padel games and pickleball points won) and an organiser draw. Top 4 of the combined table reach the semi-finals (1st v 4th, 2nd v 3rd).</p>
  </div>;
}
