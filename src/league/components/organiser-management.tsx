import { CalendarDays, GitBranch, PencilLine, Users } from 'lucide-react';
import { ScoreCorrections } from '@league/components/score-corrections';
import { Button } from '@league/ui/button';
import { LeagueOrganiser } from '@league/components/league-organiser';
import { TournamentSetup } from '@league/components/tournament-setup';
import type { TournamentData } from '@league/hooks/use-tournament';

export type ManagementSection = 'teams' | 'rounds' | 'matchups' | 'scores';

/** One navigation level: team setup, round operations, then automatic progression. */
export function OrganiserManagement({ d, section, onChange }: { d: TournamentData; section: ManagementSection; onChange: (section: ManagementSection) => void }) {
  return <section className="tn-management" aria-label="Organiser management">
    <div className="tn-management-nav lg-tabs" role="group" aria-label="Management sections">
      {([['teams', 'Teams', Users], ['rounds', 'Rounds', CalendarDays], ['matchups', 'Matchups', GitBranch], ['scores', 'Scores', PencilLine]] as const).map(([key, label, Icon]) =>
        <Button key={key} variant="ghost" aria-pressed={section === key} onClick={() => onChange(key)}><Icon size={17} />{label}</Button>)}
    </div>
    {section === 'scores' ? <ScoreCorrections d={d} /> : section === 'rounds' ? <LeagueOrganiser d={d} /> : <TournamentSetup d={d} section={section === 'teams' ? 'groups' : 'rounds'} />}
  </section>;
}