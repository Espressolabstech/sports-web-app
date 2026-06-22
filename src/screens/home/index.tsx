import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getVenues } from '../../api/adapters/venues';
import { ChevronDown, MapPin, Search, X } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { SportChips } from '../../components/SportChips';
import { BottomNav } from '../../components/BottomNav';
import { FacilityCard } from '../../components/FacilityCard';
import { getToken } from '../../utils/cookies.helpers';
import { Sheet, SheetContent } from '../../components/ui/sheet';
import { AnimatedLoader } from '../../components/AnimatedLoader';

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
        <div className="min-h-screen bg-background pb-24">
            {/* ═══════ HEADER ═══════ */}
            <div className="mx-auto max-w-4xl">
                <div className="relative px-5 pb-9 pt-[2.1rem] rounded-b-3xl overflow-hidden bg-[linear-gradient(90deg,rgba(38,117,148,1)_0%,rgba(16,45,69,1)_70%)]">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h1 className="text-[22px] font-bold tracking-tight text-white leading-none">
                                BookEase
                            </h1>
                            <button
                                onClick={() => setCityOpen(true)}
                                className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-white/80 hover:text-white transition-colors"
                            >
                                <MapPin className="h-3 w-3 shrink-0" />
                                <span className="truncate">{city}</span>
                                <ChevronDown className="h-3 w-3 shrink-0 text-white/60" />
                            </button>
                        </div>
                        {!user && (
                            <button
                                onClick={() => navigate('/login')}
                                className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0F172A] shadow-sm transition-colors hover:bg-white/90"
                            >
                                Log in
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <main className="mx-auto max-w-xl px-4">
                {/* ═══════ SEARCH (overlaps header) ═══════ */}
                <div className="-mt-5 relative">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search venues or locations"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-12 rounded-2xl border bg-card pl-11 text-[15px] shadow-md focus-visible:ring-1"
                    />
                </div>

                {/* ═══════ SPORTS ═══════ */}
                <section className="mt-6">
                    <SportChips selected={sport} onSelect={setSport} />
                </section>

                {/* ═══════ VENUES ═══════ */}
                <section className="mt-6">
                    {!isLoading && !isError && (
                        <div className="mb-3 flex items-baseline justify-between">
                            <h2 className="text-[15px] font-medium tracking-tight text-muted-foreground">
                                Venues near you
                            </h2>
                            <span className="text-xs text-muted-foreground/70">
                                {venues.length} {venues.length === 1 ? 'result' : 'results'}
                            </span>
                        </div>
                    )}

                    <div className="space-y-3">
                        {isLoading ? (
                            <div className="flex justify-center py-12">
                                <AnimatedLoader label="Finding venues…" />
                            </div>
                        ) : isError ? (
                            <p className="py-12 text-center text-sm text-muted-foreground">
                                Failed to load venues. Please try again.
                            </p>
                        ) : venues.length === 0 ? (
                            <p className="py-12 text-center text-sm text-muted-foreground">
                                No venues match your filters
                            </p>
                        ) : (
                            venues.map((venue) => (
                                <FacilityCard key={venue.id} facility={venue} />
                            ))
                        )}
                    </div>
                </section>
            </main>

            <BottomNav />

            {/* ═══════ CITY PICKER ═══════ */}
            <Sheet open={cityOpen} onOpenChange={setCityOpen}>
                <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] flex flex-col p-0">
                    <div className="flex items-center justify-between px-4 pt-5 pb-3 shrink-0">
                        <h2 className="text-base font-bold text-foreground">Select City</h2>
                        <button
                            onClick={() => { setCityOpen(false); setCitySearch(''); }}
                            className="rounded-full p-1 hover:bg-muted transition-colors"
                        >
                            <X className="h-5 w-5 text-muted-foreground" />
                        </button>
                    </div>

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
