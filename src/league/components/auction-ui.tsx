import type { Team } from '@league/lib/auction';
import { initials } from '@league/lib/auction';

export function TeamLogo({ team, size = 28 }: { team?: Team | null | undefined; size?: number }) {
    if (!team) return null;
    return team.logo_path ? (
        <img src={team.logo_path} alt="" width={size} height={size} className="rounded-full object-cover bg-secondary shrink-0" style={{ width: size, height: size }} />
    ) : (
        <span aria-hidden="true" className="rounded-full bg-secondary text-muted-foreground grid place-items-center font-semibold shrink-0" style={{ width: size, height: size, fontSize: size * 0.36 }}>
            {initials(team.name).slice(0, 2)}
        </span>
    );
}
