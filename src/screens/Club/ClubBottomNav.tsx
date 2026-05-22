import { Home, CalendarDays, User } from 'lucide-react';
import { NavLink, useParams } from 'react-router-dom';
import { cn } from '../../utils/twMerge';
import { useClub } from './ClubContext';

export function ClubBottomNav() {
    const { venueId } = useParams();
    const { brandColor } = useClub();

    const item = (to: string, Icon: React.ElementType, label: string, end = false) => (
        <NavLink
            to={to}
            end={end}
            className={({ isActive }) =>
                cn(
                    'flex flex-col items-center gap-0.5 px-5 py-2 text-[11px] font-medium transition-colors',
                    isActive
                        ? 'text-[hsl(var(--club-accent))]'
                        : 'text-[hsl(var(--club-muted))]',
                )
            }
            style={({ isActive }) => (isActive ? { color: brandColor } : {})}
        >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
        </NavLink>
    );

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[hsl(var(--club-border))] bg-[hsl(var(--club-surface))]">
            <div className="mx-auto flex max-w-lg items-center justify-around">
                {item(`/club/${venueId}`, Home, 'Home', true)}
                {item(`/club/${venueId}/bookings`, CalendarDays, 'Bookings')}
                {item(`/club/${venueId}/profile`, User, 'Profile')}
            </div>
        </nav>
    );
}
