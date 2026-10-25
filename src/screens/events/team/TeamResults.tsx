import { shortName, teamLabel, type TeamTournament } from "../../../lib/team/teamTournament";
import { muted } from "./team-ui";
import { standingsView } from "./standings-view";
export default function TeamResults({ data }: { data: TeamTournament }) {
  const label = (id: string) => teamLabel(data.teams.find(t => t.id === id));
  return <div className="space-y-7">{Array.from({ length: data.rules.groups }, (_, group) => <section key={group} aria-label={`Group ${group + 1} standings`}>
    <div className="mb-2 flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold"><span className="h-4 w-1 rounded-full bg-[hsl(var(--event-on-ink-muted))]" aria-hidden />Group {group + 1}</h2>
      <span className={`text-[11px] ${muted}`}>Top {data.rules.qualifiers} advance</span>
    </div>
    <table className="w-full table-fixed border-separate border-spacing-x-0 border-spacing-y-1.5 text-[11px] tabular-nums">
      <colgroup><col className="w-[44%]" /><col className="w-[9%]" /><col className="w-[9%]" /><col className="w-[9%]" /><col className="w-[14%]" /><col className="w-[15%]" /></colgroup>
      <thead className={muted}><tr>{["Team", "P", "W", "L", "Sets", "Games"].map(h => <th key={h} scope="col" className={`pb-1 font-medium ${h === "Team" ? "pl-3 text-left" : "text-center"}`}>{h}</th>)}</tr></thead>
      <tbody>{standingsView(data, group).map(r => {
        const team = data.teams.find(t => t.id === r.id);
        const teamName = team?.name?.trim();
        const playerLabel = team?.players.map(p => p.name.trim()).join(" / ");
        return <tr key={r.id} className="team-standing-row" data-qualifying={r.qualifying}>
          <td className="py-2.5 pl-2 pr-1"><div className="flex items-center gap-2">
            <span className={`w-4 shrink-0 text-center text-sm font-bold ${r.qualifying ? "text-[hsl(var(--event-success-text))]" : muted}`}>{r.rank}</span>
            <div className="min-w-0 flex-1">
              {teamName && teamName !== playerLabel && <p className={`mb-0.5 break-words text-[10px] leading-3.5 ${muted}`}>{teamName}</p>}
              {team?.players.map((p, i) => <p key={i} title={p.name} className="break-words text-xs font-semibold leading-4">{shortName(p.name)}</p>)}
            </div>
          </div></td>
          <td className={`text-center ${muted}`}>{r.played}</td><td className={`text-center text-xs font-bold ${r.qualifying ? "text-[hsl(var(--event-success-text))]" : ""}`}>{r.wins}</td><td className={`text-center ${muted}`}>{r.losses}</td><td className="whitespace-nowrap text-center">{r.sw}–{r.sl}</td><td className="whitespace-nowrap text-center">{r.gw}–{r.gl}</td>
        </tr>;
      })}</tbody>
    </table>
  </section>)}{data.knockout && Array.from(new Set(data.matches.filter(m => m.stage > 0).map(m => m.stage))).map(stage => {
    const all = data.matches.filter(m => m.stage === stage), byes = all.filter(m => !m.b), matches = all.filter(m => m.b);
    const title = all.length === 1 ? "Final" : all.length === 2 ? "Semifinals" : all.length === 4 ? "Quarterfinals" : `Knockout round ${stage}`;
    return <section key={stage}><h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {matches.length > 0 && <div className="divide-y divide-[hsl(var(--event-on-ink)/0.08)] overflow-hidden rounded-lg bg-[hsl(var(--event-ink-soft))]">{matches.map(m => {
        const cols = Math.max(1, m.sets.length);
        return <div key={m.id} className="space-y-1.5 px-3 py-2.5">{(["a", "b"] as const).map(side => {
          const id = m[side];
          if (!id) return null;
          const won = m.winner === id, lost = Boolean(m.winner) && !won;
          return <div key={side} className="flex items-center gap-3 text-sm">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${won ? "bg-[hsl(var(--event-success))]" : "bg-transparent"}`} aria-hidden="true" />
            <span className={`min-w-0 flex-1 truncate ${won ? "font-semibold" : lost ? muted : ""}`}>{label(id)}</span>
            <span className="grid shrink-0 gap-3 text-right tabular-nums" style={{ gridTemplateColumns: `repeat(${cols}, 1.25rem)` }}>{m.sets.length ? m.sets.map((s, i) => { const g = s[side], o = side === "a" ? s.b : s.a; return <span key={i} className={g > o ? "font-semibold" : muted}>{g}</span>; }) : <span className={muted}>–</span>}</span>
          </div>;
        })}</div>;
      })}</div>}
      {byes.length > 0 && <p className={`mt-2 px-1 text-xs ${muted}`}>Byes · {byes.map(m => label(m.a)).join(", ")}</p>}
    </section>; })}</div>;
}
