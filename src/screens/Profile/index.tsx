import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEMO_PURCHASED_PACKAGES } from '../../utils/mockData';
import { Card, CardContent } from '../../components/ui/card';
import { Bell, ChevronRight, HelpCircle, LogOut, Phone, Shield, User, Wallet } from 'lucide-react';
import { PlayerTierStatusWidget } from '../../components/PlayerTierStatusWidget';
import { Switch } from '../../components/ui/switch';
import { Badge } from '../../components/ui/badge';
import { format } from 'date-fns';
import { Button } from '../../components/ui/button';
import { BottomNav } from '../../components/BottomNav';

const MyProfile = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<{ phone: string; id: string } | null>(
        null,
    );
    const [pushNotifications, setPushNotifications] = useState(true);

    const displayUser = user ?? { phone: '+971 50 123 4567', id: 'demo' };
    const displayPhone = (displayUser as any).phone || '+971 50 123 4567';

    const handleLogout = () => {
        // logout();
        navigate('/');
    };

    const totalCreditsPurchased = DEMO_PURCHASED_PACKAGES.reduce(
        (sum, p) => sum + p.credit_value,
        0,
    );
    const totalSpent = DEMO_PURCHASED_PACKAGES.reduce(
        (sum, p) => sum + p.cash_amount,
        0,
    );

    const tierColors: Record<string, string> = {
        pro: 'bg-primary/10 text-primary',
        elite: 'bg-amber-500/10 text-amber-600',
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
                        <div className="flex items-center gap-4">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground shrink-0">
                                <User className="h-6 w-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-foreground text-lg">
                                    Guest User
                                </p>
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                                    <Phone className="h-3.5 w-3.5" />
                                    <span>{displayPhone}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Membership Status */}
                <PlayerTierStatusWidget playerId={displayUser.id} />

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
                                        Privacy & Security
                                    </span>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </button>
                            <button className="flex items-center justify-between px-4 py-3.5 w-full hover:bg-accent/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm text-foreground">
                                        Help & Support
                                    </span>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </button>
                        </CardContent>
                    </Card>
                </div>

                {/* Credit Packages Purchased */}
                <div>
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                        Credit Packages
                    </h2>

                    {/* Summary row */}
                    <Card className="mb-2">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                                    <Wallet className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-foreground">
                                        ₹
                                        {totalCreditsPurchased.toLocaleString()}{' '}
                                        total credits
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        ₹{totalSpent.toLocaleString()} spent
                                        across {DEMO_PURCHASED_PACKAGES.length}{' '}
                                        packages
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Individual purchases */}
                    <div className="space-y-2">
                        {DEMO_PURCHASED_PACKAGES.map((pkg) => (
                            <Card key={pkg.id}>
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <p className="font-semibold text-foreground text-sm">
                                                    {pkg.package_name}
                                                </p>
                                                {pkg.tier_grant && (
                                                    <Badge
                                                        variant="secondary"
                                                        className={`text-[10px] px-1.5 py-0 capitalize ${tierColors[pkg.tier_grant] || ''}`}
                                                    >
                                                        {pkg.tier_grant}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {pkg.venue_name}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {format(
                                                    new Date(pkg.purchased_at),
                                                    'MMM d, yyyy',
                                                )}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-semibold text-foreground">
                                                ₹
                                                {pkg.credit_value.toLocaleString()}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                                paid ₹
                                                {pkg.cash_amount.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

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
