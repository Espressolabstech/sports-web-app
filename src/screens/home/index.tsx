import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getVenues } from '../../api/adapters/venues';
import { ChevronDown, LogIn, MapPin, Search, User } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { SportChips } from '../../components/SportChips';
import { BottomNav } from '../../components/BottomNav';
import { FacilityCard } from '../../components/FacilityCard';
import { getToken } from '../../utils/cookies.helpers';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';

const CITIES = [
    'Mumbai',
    'Delhi',
    'Bangalore',
    'Hyderabad',
    'Chennai',
    'Kolkata',
    'Pune',
    'Ahmedabad',
    'Jaipur',
    'Surat',
    'Lucknow',
    'Kochi',
    'Chandigarh',
    'Indore',
    'Bhopal',
];

const Home = () => {
    const [search, setSearch] = useState('');
    const [sport, setSport] = useState('All');
    const [city, setCity] = useState('Mumbai');
    const navigate = useNavigate();

    const user = !!getToken();

    const { data, isLoading, isError } = useQuery({
        queryKey: ['venues', city, sport, search],
        queryFn: () =>
            getVenues({
                city,
                sport: sport !== 'All' ? sport : undefined,
                search: search || undefined,
            }),
    });

    const venues = Array.isArray(data?.data?.venues) ? data.data.venues : [];

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <header className="bg-primary px-4 pb-6 pt-10 text-primary-foreground">
                <div className="mx-auto max-w-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold">BookEase</h1>
                            <DropdownMenu>
                                <DropdownMenuTrigger className="mt-0.5 flex items-center gap-1 text-sm opacity-90 hover:opacity-100">
                                    <MapPin className="h-3.5 w-3.5" />
                                    <span>{city}</span>
                                    <ChevronDown className="h-3 w-3" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                    {CITIES.map((c) => (
                                        <DropdownMenuItem
                                            key={c}
                                            onSelect={() => setCity(c)}
                                            className={c === city ? 'font-medium' : ''}
                                        >
                                            {c}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        {user ? (
                            <button
                                onClick={() => navigate('/profile')}
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/20 hover:bg-primary-foreground/30 transition-colors"
                            >
                                <User className="h-5 w-5" />
                            </button>
                        ) : (
                            <button
                                onClick={() => navigate('/login')}
                                className="flex items-center gap-1.5 rounded-full bg-primary-foreground/20 px-3 py-1.5 text-sm font-medium hover:bg-primary-foreground/30 transition-colors"
                            >
                                <LogIn className="h-4 w-4" />
                                Sign In
                            </button>
                        )}
                    </div>
                    <div className="relative mt-4">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search facilities..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="border-0 bg-card pl-10 text-foreground shadow-sm"
                        />
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="mx-auto max-w-lg px-4 pt-4">
                <SportChips selected={sport} onSelect={setSport} />

                <div className="mt-4 space-y-3">
                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className="h-48 animate-pulse rounded-xl bg-muted"
                                />
                            ))}
                        </div>
                    ) : isError ? (
                        <p className="py-12 text-center text-muted-foreground">
                            Failed to load venues. Please try again.
                        </p>
                    ) : venues.length === 0 ? (
                        <p className="py-12 text-center text-muted-foreground">
                            No facilities found
                        </p>
                    ) : (
                        venues.map((venue) => (
                            <FacilityCard key={venue.id} facility={venue} />
                        ))
                    )}
                </div>
            </main>

            <BottomNav />
        </div>
    );
};

export default Home;
