import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '../../components/ui/card';
import { ArrowLeft, MapPin, Wallet } from 'lucide-react';
import { Skeleton } from '../../components/ui/skeleton';
import { BottomNav } from '../../components/BottomNav';
import { getMe } from '../../api/adapters/auth';

const Wallets = () => {
    const navigate = useNavigate();

    const { data, isLoading } = useQuery({
        queryKey: ['me'],
        queryFn: getMe,
    });

    const profile = data?.data;
    const globalBalance = Number(profile?.wallet?.balance ?? 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const venueMemberships: Array<{
        tier: string | null;
        totalSpend: number;
        totalBookings: number;
        venue: { id: string; name: string; city: string };
    }> = (profile as any)?.venueMemberships ?? [];

    return (
        <div className="min-h-screen bg-background pb-20">
            <header className="bg-primary px-4 pb-6 pt-10 text-primary-foreground">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-1 -ml-1 rounded-full hover:bg-white/10 transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <h1 className="text-xl font-bold">My Wallets</h1>
                </div>
            </header>

            <main className="mx-auto max-w-lg space-y-5 px-4 pt-5">
                {/* Global Wallet */}
                {isLoading ? (
                    <Skeleton className="h-24 w-full rounded-xl" />
                ) : (
                    <Card className="border-primary/20 bg-primary/5">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Wallet className="h-4 w-4 text-primary" />
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    Total Balance
                                </span>
                            </div>
                            <p className="text-2xl font-bold text-foreground">
                                ₹{globalBalance.toLocaleString('en-IN')}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Available across all venues
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Per-Venue Wallets */}
                <div>
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                        Venue Wallets
                    </h2>

                    {isLoading ? (
                        <div className="space-y-3">
                            <Skeleton className="h-20 w-full rounded-xl" />
                            <Skeleton className="h-20 w-full rounded-xl" />
                        </div>
                    ) : venueMemberships.length === 0 ? (
                        <Card>
                            <CardContent className="p-6 text-center">
                                <Wallet className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">
                                    No venue wallets yet. Book a session to get started.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {venueMemberships.map((m) => (
                                <Card key={m.venue.id}>
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-foreground text-sm">
                                                    {m.venue.name}
                                                </p>
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                                    <MapPin className="h-3 w-3" />
                                                    <span>{m.venue.city}</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {m.totalBookings} session{m.totalBookings !== 1 ? 's' : ''}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-sm font-bold text-foreground">
                                                    ₹{Number(m.totalSpend).toLocaleString('en-IN')}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    total spent
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <BottomNav />
        </div>
    );
};

export default Wallets;
