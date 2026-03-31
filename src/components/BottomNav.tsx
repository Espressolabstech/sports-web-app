import { Home, CalendarDays, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../utils/twMerge';
import { path } from '../navigation/commanPaths';

const tabs = [
    { to: path.home, icon: Home, label: 'Home' },
    { to: path.MyBookings, icon: CalendarDays, label: 'My Bookings' },
    { to: '/profile', icon: User, label: 'Profile' },
];

export function BottomNav() {
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card">
            <div className="mx-auto flex max-w-lg items-center justify-around py-2">
                {tabs.map((tab) => (
                    <NavLink
                        key={tab.to}
                        to={tab.to}
                        end={tab.to === '/'}
                        className={({ isActive }) =>
                            cn(
                                'flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors',
                                isActive
                                    ? 'text-primary'
                                    : 'text-muted-foreground',
                            )
                        }
                    >
                        <tab.icon className="h-5 w-5" />
                        <span>{tab.label}</span>
                    </NavLink>
                ))}
            </div>
        </nav>
    );
}
