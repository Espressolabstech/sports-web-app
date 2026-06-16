import { Home, CalendarDays, User, LogIn } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '../utils/twMerge';
import { path } from '../navigation/commanPaths';
import { getToken } from '../utils/cookies.helpers';
import { useState } from 'react';
import { PhoneLoginModal } from './PhoneLoginModal';

const navClass = ({ isActive }: { isActive: boolean }) =>
    cn(
        'flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors',
        isActive ? 'text-primary' : 'text-muted-foreground',
    );

const guestClass =
    'flex flex-col items-center gap-0.5 px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-primary';

export function BottomNav() {
    const user = !!getToken();
    const navigate = useNavigate();
    const [loginOpen, setLoginOpen] = useState(false);

    return (
        <>
            <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card">
                <div className="mx-auto flex max-w-lg items-center justify-around py-2">
                    <NavLink to={path.home} end className={navClass}>
                        <Home className="h-5 w-5" />
                        <span>Home</span>
                    </NavLink>

                    {user ? (
                        <NavLink to={path.MyBookings} className={navClass}>
                            <CalendarDays className="h-5 w-5" />
                            <span>My Bookings</span>
                        </NavLink>
                    ) : (
                        <button onClick={() => setLoginOpen(true)} className={guestClass}>
                            <CalendarDays className="h-5 w-5" />
                            <span>My Bookings</span>
                        </button>
                    )}

                    {user ? (
                        <NavLink to="/profile" className={navClass}>
                            <User className="h-5 w-5" />
                            <span>Profile</span>
                        </NavLink>
                    ) : (
                        <button onClick={() => navigate('/login')} className={guestClass}>
                            <LogIn className="h-5 w-5" />
                            <span>Sign In</span>
                        </button>
                    )}
                </div>
            </nav>

            <PhoneLoginModal
                open={loginOpen}
                onOpenChange={setLoginOpen}
                onSuccess={() => navigate(path.MyBookings)}
            />
        </>
    );
}
