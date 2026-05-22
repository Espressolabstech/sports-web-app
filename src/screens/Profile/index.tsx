import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '../../components/ui/card';
import {
    Bell,
    ChevronRight,
    HelpCircle,
    LogOut,
    MapPin,
    Phone,
    Shield,
    Trophy,
    Wallet,
} from 'lucide-react';
import { path } from '../../navigation/commanPaths';
import { Switch } from '../../components/ui/switch';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { format } from 'date-fns';
import { Button } from '../../components/ui/button';
import { BottomNav } from '../../components/BottomNav';
import { getMe } from '../../api/adapters/auth';
import { clearCookies } from '../../utils/cookies.helpers';
import { useState } from 'react';

const TIER_COLORS: Record<string, string> = {
    PRO: 'bg-primary/10 text-primary',
    ELITE: 'bg-amber-500/10 text-amber-600',
    CLUB: 'bg-muted text-muted-foreground',
};

const MyProfile = () => {
    const navigate = useNavigate();
    const [pushNotifications, setPushNotifications] = useState(true);

    const { data, isLoading } = useQuery({
        queryKey: ['me'],
        queryFn: getMe,
    });

    const profile = data?.data;
    const user = profile?.user;
    const wallets = profile?.wallets ?? [];
    const purchases = profile?.purchases ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const venueMemberships: Array<{
        tier: string | null;
        totalSpend: number;
        totalBookings: number;
        venue: { id: string; name: string; city: string };
    }> = (profile as any)?.venueMemberships ?? [];

    const totalCreditsPurchased = purchases.reduce(
        (sum, p) => sum + Number(p.package.amount),
        0,
    );
    const totalSpent = purchases.reduce((sum, p) => sum + Number(p.amountPaid), 0);

    const handleLogout = () => {
        clearCookies();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            <header className="bg-primary px-4 pb-6 pt-10 text-primary-foreground">
                <h1 className="text-xl font-bold">Profile</h1>
            </header>

            <main className="mx-auto max-w-lg space-y-5 px-4 -mt-2">
                {/* Player Info Card */}
                <Card className="overflow-hidden shadow-md">
                    <CardContent className="p-5">
                        {isLoading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-5 w-40" />
                                <Skeleton className="h-4 w-32" />
                            </div>
                        ) : (
                            <div>
                                <p className="font-bold text-foreground text-lg">
                                    {user?.name ?? 'Player'}
                                </p>
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                                    <Phone className="h-3.5 w-3.5" />
                                    <span>
                                        {user?.countryCode}{' '}
                                        {user?.phone}
                                    </span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Wallet & Stats */}
                {isLoading ? (
                    <Skeleton className="h-24 w-full rounded-xl" />
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        <Card
                            className="cursor-pointer hover:bg-accent/50 transition-colors"
                            onClick={() => navigate(path.wallets)}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <Wallet className="h-4 w-4 text-primary" />
                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                            Wallet
                                        </span>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <p className="text-sm font-medium text-foreground">
                                    View all venue wallets
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Tap to see your balances
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <Shield className="h-4 w-4 text-primary" />
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                        Bookings
                                    </span>
                                </div>
                                <p className="text-xl font-bold text-foreground">
                                    {profile?.totalBookings ?? 0}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Total sessions
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Account Settings */}
                <div>
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                        Account Settings
                    </h2>
                    <Card>
                        <CardContent className="p-0 divide-y divide-border">
                            <div className="flex items-center justify-between px-4 py-3.5">
                                <div className="flex items-center gap-3">
                                    <Bell className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm text-foreground">
                                        Push Notifications
                                    </span>
                                </div>
                                <Switch
                                    checked={pushNotifications}
                                    onCheckedChange={setPushNotifications}
                                />
                            </div>
                            <button className="flex items-center justify-between px-4 py-3.5 w-full hover:bg-accent/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <Shield className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm text-foreground">
                                        Privacy &amp; Security
                                    </span>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </button>
                            <button className="flex items-center justify-between px-4 py-3.5 w-full hover:bg-accent/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm text-foreground">
                                        Help &amp; Support
                                    </span>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </button>
                        </CardContent>
                    </Card>
                </div>

                {/* Credit Packages Purchased */}
                {isLoading ? (
                    <Skeleton className="h-24 w-full rounded-xl" />
                ) : purchases.length > 0 ? (
                    <div>
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                            Credit Packages
                        </h2>

                        <Card className="mb-2">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                                        <Wallet className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-foreground">
                                            ₹{totalCreditsPurchased.toLocaleString()} total credits
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            ₹{totalSpent.toLocaleString()} spent across{' '}
                                            {purchases.length} package{purchases.length !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="space-y-2">
                            {purchases.map((p) => (
                                <Card key={p.id}>
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <p className="font-semibold text-foreground text-sm">
                                                        {p.package.name}
                                                    </p>
                                                    {p.package.tierUnlock && (
                                                        <Badge
                                                            variant="secondary"
                                                            className={`text-[10px] px-1.5 py-0 capitalize ${TIER_COLORS[p.package.tierUnlock] ?? ''}`}
                                                        >
                                                            {p.package.tierUnlock.toLowerCase()}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {format(new Date(p.createdAt), 'MMM d, yyyy')}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-sm font-semibold text-foreground">
                                                    ₹{p.package.amount.toLocaleString()}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    paid ₹{p.amountPaid.toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                ) : null}

                {/* Venue Memberships */}
                {isLoading ? (
                    <Skeleton className="h-24 w-full rounded-xl" />
                ) : venueMemberships.length > 0 ? (
                    <div>
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                            My Memberships
                        </h2>
                        <div className="space-y-2">
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
                                                    {m.totalBookings} session{m.totalBookings !== 1 ? 's' : ''} · ₹{Number(m.totalSpend).toLocaleString('en-IN')} spent
                                                </p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                {m.tier ? (
                                                    <Badge
                                                        variant="secondary"
                                                        className={`text-xs px-2 capitalize ${TIER_COLORS[m.tier] ?? ''}`}
                                                    >
                                                        <Trophy className="h-3 w-3 mr-1" />
                                                        {m.tier.toLowerCase()}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="text-xs px-2 text-muted-foreground">
                                                        No tier
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                ) : null}

                {/* Sign Out */}
                <Button
                    variant="outline"
                    className="w-full text-destructive border-destructive/30 hover:bg-destructive/5"
                    onClick={handleLogout}
                >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                </Button>
            </main>

            <BottomNav />
        </div>
    );
};

export default MyProfile;
