import { Outlet } from 'react-router-dom';
import { ClubProvider, useClub } from './ClubContext';
import { ClubBottomNav } from './ClubBottomNav';

function ClubRoot() {
    const { brandColor } = useClub();
    // Both --club-accent and --primary get the club color so all bg-primary usages inherit it
    const hslValue = brandColor.startsWith('hsl(')
        ? brandColor.slice(4, -1)
        : brandColor;

    return (
        <div
            className="club-root min-h-screen bg-[hsl(var(--club-bg))] text-[hsl(var(--club-ink))] pb-16"
            style={{
                '--club-accent': hslValue,
                '--primary': hslValue,
                '--primary-foreground': '0 0% 100%',
            } as React.CSSProperties}
        >
            <Outlet />
            <ClubBottomNav />
        </div>
    );
}

export default function ClubLayout() {
    return (
        <ClubProvider>
            <ClubRoot />
        </ClubProvider>
    );
}
