import { Phone } from 'lucide-react';
import { LeaguePlayerCard } from '@league/components/league-player-card';
import { squadFor } from '@league/lib/league-squads';
import { useLeague, type PlayerProfile } from '@league/lib/league-store';

/** Team squad in the auction Player Hub tile style, with photo and mobile per player. */
export function SquadGrid({ code, profiles }: { code: string; profiles: Record<string, PlayerProfile> }) {
  const squad = squadFor(code);
  // Mobiles are organiser-only (handoff §9): the server never sends them to teams.
  const organiser = !!useLeague().organiser;
  return <section className="lx-squad" aria-label="Squad">
    <p className="lx-count">Squad <span aria-hidden>—</span> <strong>{squad.length} players</strong></p>
    <ul className="lx-squad-grid">{squad.map(p => { const pr = profiles[p.id] ?? {};
      return <li key={p.id} className="lx-squad-card">
        <LeaguePlayerCard player={p} expanded {...(pr.photo ? { photo: pr.photo } : {})} />
        {organiser && <p className="lx-squad-mobile"><Phone size={14} /><span><small>Mobile number</small>{pr.mobile ? <a href={`tel:+91${pr.mobile}`}>{pr.mobile}</a> : <span>Not provided</span>}</span></p>}
      </li>; })}</ul>
  </section>;
}
