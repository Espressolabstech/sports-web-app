import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getVenues } from '../../api/adapters/venues';
import { getMyClubs } from '../../api/adapters/pointsWallet';
import { ChevronDown, LogIn, MapPin, Search, Shield, Sparkles, X } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { SportChips } from '../../components/SportChips';
import { BottomNav } from '../../components/BottomNav';
import { FacilityCard } from '../../components/FacilityCard';
import { getToken } from '../../utils/cookies.helpers';
import { Sheet, SheetContent } from '../../components/ui/sheet';

const POPULAR_CITIES = [
    'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
    'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Kochi',
];

const ALL_CITIES = [
    'Agra', 'Ahmedabad', 'Ajmer', 'Aligarh', 'Allahabad', 'Amravati',
    'Amritsar', 'Aurangabad', 'Bangalore', 'Bareilly', 'Bhopal',
    'Bhubaneswar', 'Chandigarh', 'Chennai', 'Coimbatore', 'Cuttack',
    'Dehradun', 'Delhi', 'Dhanbad', 'Durgapur', 'Faridabad', 'Ghaziabad',
    'Guwahati', 'Gwalior', 'Howrah', 'Hubli', 'Hyderabad', 'Indore',
    'Jabalpur', 'Jaipur', 'Jalandhar', 'Jammu', 'Jamshedpur', 'Jodhpur',
    'Kanpur', 'Kochi', 'Kolkata', 'Kota', 'Kozhikode', 'Lucknow',
    'Ludhiana', 'Madurai', 'Mangalore', 'Meerut', 'Mumbai', 'Mysore',
    'Nagpur', 'Nashik', 'Navi Mumbai', 'Noida', 'Patna', 'Pune',
    'Raipur', 'Rajkot', 'Ranchi', 'Srinagar', 'Surat', 'Thane',
    'Tiruchirappalli', 'Tiruppur', 'Vadodara', 'Varanasi', 'Vijayawada',
    'Visakhapatnam', 'Warangal',
].sort();

const CITY_KEY = 'bookease_city';

const getStoredCity = () => localStorage.getItem(CITY_KEY) ?? 'Mumbai';
const storeCity = (city: string) => localStorage.setItem(CITY_KEY, city);

const Home = () => {
    const [search, setSearch] = useState('');
    const [sport, setSport] = useState('All');
    const [city, setCity] = useState(getStoredCity);
    const [cityOpen, setCityOpen] = useState(false);
    const [citySearch, setCitySearch] = useState('');
    const navigate = useNavigate();

    const user = !!getToken();

    const { data: clubsData } = useQuery({
        queryKey: ['my-clubs'],
        queryFn: getMyClubs,
        enabled: user,
    });
    const myClubs: ApiMyClub[] = clubsData?.data?.clubs ?? [];

    const handleCitySelect = (c: string) => {
        setCity(c);
        storeCity(c);
        setCityOpen(false);
        setCitySearch('');
    };

    const filteredCities = citySearch.trim()
        ? ALL_CITIES.filter((c) =>
              c.toLowerCase().includes(citySearch.trim().toLowerCase()),
          )
        : null;

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
                            <button
                                onClick={() => setCityOpen(true)}
                                className="mt-0.5 flex items-center gap-1 text-sm opacity-90 hover:opacity-100"
                            >
                                <MapPin className="h-3.5 w-3.5" />
                                <span className="font-medium">{city}</span>
                                <ChevronDown className="h-3 w-3" />
                            </button>
                        </div>
                        {!user && (
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

                {/* ── My Club ── */}
                {myClubs.length > 0 && (
                    <div className="mt-4">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                            My Club
                        </p>
                        <div className="space-y-2">
                            {myClubs.map(({ venue, wallet }) => (
                                <button
                                    key={venue.id}
                                    onClick={() => navigate(venue.slug ? `/club/${venue.slug}` : `/venue/${venue.id}`)}
                                    className="w-full flex items-center gap-3 rounded-xl border-2 border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/30 p-3.5 hover:shadow-md transition-all text-left group"
                                >
                                    {venue.venueImages[0] ? (
                                        <img
                                            src={venue.venueImages[0].url}
                                            alt={venue.name}
                                            className="h-12 w-12 rounded-lg object-cover shrink-0"
                                        />
                                    ) : (
                                        <div className="h-12 w-12 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
                                            <Shield className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-foreground text-sm leading-tight">
                                            {venue.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            <MapPin className="h-3 w-3 inline mr-0.5" />
                                            {venue.city}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        {wallet ? (
                                            <>
                                                <p className="text-sm font-bold text-violet-700 dark:text-violet-300">
                                                    {wallet.balance.toLocaleString()}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    pts available
                                                </p>
                                            </>
                                        ) : (
                                            <Sparkles className="h-4 w-4 text-violet-500" />
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

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
                            <FacilityCard
                                key={venue.id}
                                facility={venue}
                                selectedSport={sport !== 'All' ? sport : undefined}
                            />
                        ))
                    )}
                </div>
            </main>

            <BottomNav />

            {/* City picker sheet */}
            <Sheet open={cityOpen} onOpenChange={setCityOpen}>
                <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] flex flex-col p-0">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 pt-5 pb-3 shrink-0">
                        <h2 className="text-base font-bold text-foreground">Select City</h2>
                        <button
                            onClick={() => { setCityOpen(false); setCitySearch(''); }}
                            className="rounded-full p-1 hover:bg-muted transition-colors"
                        >
                            <X className="h-5 w-5 text-muted-foreground" />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="px-4 pb-3 shrink-0">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search city..."
                                value={citySearch}
                                onChange={(e) => setCitySearch(e.target.value)}
                                className="pl-9"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="overflow-y-auto flex-1 px-4 pb-8">
                        {filteredCities ? (
                            /* Search results */
                            filteredCities.length === 0 ? (
                                <p className="py-8 text-center text-sm text-muted-foreground">
                                    No cities found
                                </p>
                            ) : (
                                <div className="space-y-1">
                                    {filteredCities.map((c) => (
                                        <button
                                            key={c}
                                            onClick={() => handleCitySelect(c)}
                                            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                                                c === city
                                                    ? 'bg-primary/10 text-primary font-medium'
                                                    : 'hover:bg-muted text-foreground'
                                            }`}
                                        >
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            )
                        ) : (
                            <>
                                {/* Popular cities */}
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                                    Popular Cities
                                </p>
                                <div className="flex flex-wrap gap-2 mb-5">
                                    {POPULAR_CITIES.map((c) => (
                                        <button
                                            key={c}
                                            onClick={() => handleCitySelect(c)}
                                            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                                                c === city
                                                    ? 'border-primary bg-primary/10 text-primary'
                                                    : 'border-border bg-card text-foreground hover:bg-muted'
                                            }`}
                                        >
                                            {c}
                                        </button>
                                    ))}
                                </div>

                                {/* All cities A–Z */}
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                                    All Cities
                                </p>
                                <div className="space-y-1">
                                    {ALL_CITIES.map((c) => (
                                        <button
                                            key={c}
                                            onClick={() => handleCitySelect(c)}
                                            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                                                c === city
                                                    ? 'bg-primary/10 text-primary font-medium'
                                                    : 'hover:bg-muted text-foreground'
                                            }`}
                                        >
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
};

export default Home;
