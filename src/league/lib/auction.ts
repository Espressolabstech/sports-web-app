/** Team shape the reference screens use (TeamLogo reads logo_path). */
export type Team = { id: string; name: string; logo_path: string; purse_paise: number; sort: number };
export const initials = (name: string) =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w[0]!.toUpperCase())
        .join('');
