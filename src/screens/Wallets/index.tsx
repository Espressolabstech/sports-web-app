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
    const wallets = profile?.wallets ?? [];
    const totalBalance = wallets.reduce((sum, w) => sum + Number(w.balance), 0);

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
                {/* Total Balance */}
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
                                ₹{totalBalance.toLocaleString('en-IN')}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Across {wallets.length} venue{wallets.length !== 1 ? 's' : ''}
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
                    ) : wallets.length === 0 ? (
                        <Card>
                            <CardContent className="p-6 text-center">
                                <Wallet className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">
                                    No venue wallets yet. Purchase a credit package to get started.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {wallets.map((w) => (
                                <Card key={w.venueId}>
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-foreground text-sm">
                                                    {w.venue.name}
                                                </p>
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                                    <MapPin className="h-3 w-3" />
                                                    <span>{w.venue.city}</span>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className={`text-lg font-bold ${Number(w.balance) > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                    ₹{Number(w.balance).toLocaleString('en-IN')}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    available
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
