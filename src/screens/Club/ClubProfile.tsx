import { useNavigate, useParams } from 'react-router-dom';
import {
    Bell,
    ChevronRight,
    HelpCircle,
    LogOut,
    Phone,
    Shield,
    ArrowUpCircle,
    ArrowDownCircle,
    ShoppingBag,
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Switch } from '../../components/ui/switch';
import { Skeleton } from '../../components/ui/skeleton';
import { Button } from '../../components/ui/button';
import { useClub } from './ClubContext';
import { clearCookies, clearActiveClubSlug } from '../../utils/cookies.helpers';
import { useState } from 'react';
import { format } from 'date-fns';

const TX_LABELS: Record<string, string> = {
    OPENING_BALANCE: 'Opening Balance',
    MONTHLY_ALLOWANCE: 'Monthly Allowance',
    ADMIN_CREDIT: 'Admin Credit',
    ADMIN_DEBIT: 'Admin Debit',
    BOOKING_DEDUCTION: 'Booking',
    BOOKING_REFUND: 'Booking Refund',
    EXPIRY_DEDUCTION: 'Points Expired',
    PENALTY: 'Penalty',
    POINTS_PURCHASE: 'Points Purchased',
};

const CREDIT_TYPES = new Set([
    'OPENING_BALANCE',
    'MONTHLY_ALLOWANCE',
    'ADMIN_CREDIT',
    'BOOKING_REFUND',
    'POINTS_PURCHASE',
]);

function TransactionRow({ tx }: { tx: ApiPointsTransaction }) {
    const isCredit = CREDIT_TYPES.has(tx.type);
    const Icon = tx.type === 'POINTS_PURCHASE'
        ? ShoppingBag
        : isCredit ? ArrowUpCircle : ArrowDownCircle;

    return (
        <div className="flex items-center gap-3 py-3 border-b border-[hsl(var(--club-border))] last:border-0">
            <div
                className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${
                    isCredit
                        ? 'bg-[hsl(var(--club-accent))]/10 text-[hsl(var(--club-accent))]'
                        : 'bg-destructive/10 text-destructive'
                }`}
            >
                <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[hsl(var(--club-ink))] truncate">
                    {TX_LABELS[tx.type] ?? tx.type}
                </p>
                {tx.note && (
                    <p className="text-[11px] text-[hsl(var(--club-muted))] truncate">{tx.note}</p>
                )}
                <p className="text-[11px] text-[hsl(var(--club-muted))]">
                    {format(new Date(tx.createdAt), 'MMM d, yyyy · h:mm a')}
                </p>
            </div>
            <div className="text-right shrink-0">
                <p
                    className={`text-sm font-semibold ${
                        isCredit ? 'text-[hsl(var(--club-accent))]' : 'text-destructive'
                    }`}
                >
                    {isCredit ? '+' : '−'}{Math.abs(tx.points)} pts
                </p>
                <p className="text-[10px] text-[hsl(var(--club-muted))]">
                    bal: {tx.balanceAfter}
                </p>
            </div>
        </div>
    );
}

export default function ClubProfile() {
    const navigate = useNavigate();
    const { venueId } = useParams();
    const { member, wallet, brandColor, isLoading } = useClub();
    const [pushNotifications, setPushNotifications] = useState(true);

    const transactions = wallet?.transactions ?? [];
    const monthlyRemaining = Math.max(0, (wallet?.monthlyAllocated ?? 0) - (wallet?.monthlyUsed ?? 0));
    const purchased = Math.max(0, (wallet?.balance ?? 0) - monthlyRemaining);

    const handleLogout = () => {
        clearCookies();
        clearActiveClubSlug();
        navigate(`/club/${venueId}/login`);
    };

    return (
        <div className="min-h-screen bg-[hsl(var(--club-bg))] pb-24">
            <header
                className="px-5 pb-6 pt-10 text-white"
                style={{ background: brandColor }}
            >
                <h1 className="text-xl font-bold">Profile</h1>
            </header>

            <main className="mx-auto max-w-lg space-y-4 px-4 -mt-2 pt-2">
                {/* Member info */}
                <Card className="overflow-hidden border-[hsl(var(--club-border))] bg-[hsl(var(--club-surface))]">
                    <CardContent className="p-5">
                        {isLoading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-5 w-40" />
                                <Skeleton className="h-4 w-32" />
                            </div>
                        ) : (
                            <div>
                                <p className="font-bold text-[hsl(var(--club-ink))] text-lg">
                                    {member.name}
                                </p>
                                <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--club-muted))] mt-0.5">
                                    <Phone className="h-3.5 w-3.5" />
                                    <span>{member.phoneMasked}</span>
                                </div>
                                <p className="text-xs text-[hsl(var(--club-muted))] mt-1">
                                    Member ID: {member.memberId}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Points summary */}
                {isLoading ? (
                    <Skeleton className="h-24 w-full rounded-xl" />
                ) : wallet ? (
                    <div className="grid grid-cols-3 gap-2">
                        <Card className="border-[hsl(var(--club-border))] bg-[hsl(var(--club-surface))]">
                            <CardContent className="p-3 text-center">
                                <p
                                    className="text-xl font-bold"
                                    style={{ color: brandColor }}
                                >
                                    {wallet.balance}
                                </p>
                                <p className="text-[10px] text-[hsl(var(--club-muted))]">Balance</p>
                            </CardContent>
                        </Card>
                        <Card className="border-[hsl(var(--club-border))] bg-[hsl(var(--club-surface))]">
                            <CardContent className="p-3 text-center">
                                <p className="text-xl font-bold text-[hsl(var(--club-ink))]">
                                    {monthlyRemaining}
                                </p>
                                <p className="text-[10px] text-[hsl(var(--club-muted))]">Monthly Left</p>
                            </CardContent>
                        </Card>
                        <Card className="border-[hsl(var(--club-border))] bg-[hsl(var(--club-surface))]">
                            <CardContent className="p-3 text-center">
                                <p className="text-xl font-bold text-[hsl(var(--club-ink))]">
                                    {purchased}
                                </p>
                                <p className="text-[10px] text-[hsl(var(--club-muted))]">Purchased</p>
                            </CardContent>
                        </Card>
                    </div>
                ) : null}

                {/* Points history */}
                {isLoading ? (
                    <Skeleton className="h-40 w-full rounded-xl" />
                ) : transactions.length > 0 ? (
                    <div>
                        <h2 className="text-sm font-semibold text-[hsl(var(--club-muted))] uppercase tracking-wider mb-2 px-1">
                            Points History
                        </h2>
                        <Card className="border-[hsl(var(--club-border))] bg-[hsl(var(--club-surface))]">
                            <CardContent className="px-4 py-0">
                                {transactions.map((tx) => (
                                    <TransactionRow key={tx.id} tx={tx} />
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                ) : wallet ? (
                    <p className="text-center text-sm text-[hsl(var(--club-muted))] py-4">
                        No transactions yet
                    </p>
                ) : null}

                {/* Settings */}
                <div>
                    <h2 className="text-sm font-semibold text-[hsl(var(--club-muted))] uppercase tracking-wider mb-2 px-1">
                        Settings
                    </h2>
                    <Card className="border-[hsl(var(--club-border))] bg-[hsl(var(--club-surface))]">
                        <CardContent className="p-0 divide-y divide-[hsl(var(--club-border))]">
                            <div className="flex items-center justify-between px-4 py-3.5">
                                <div className="flex items-center gap-3">
                                    <Bell className="h-4 w-4 text-[hsl(var(--club-muted))]" />
                                    <span className="text-sm text-[hsl(var(--club-ink))]">
                                        Push Notifications
                                    </span>
                                </div>
                                <Switch
                                    checked={pushNotifications}
                                    onCheckedChange={setPushNotifications}
                                />
                            </div>
                            <button className="flex items-center justify-between px-4 py-3.5 w-full">
                                <div className="flex items-center gap-3">
                                    <Shield className="h-4 w-4 text-[hsl(var(--club-muted))]" />
                                    <span className="text-sm text-[hsl(var(--club-ink))]">
                                        Privacy &amp; Security
                                    </span>
                                </div>
                                <ChevronRight className="h-4 w-4 text-[hsl(var(--club-muted))]" />
                            </button>
                            <button className="flex items-center justify-between px-4 py-3.5 w-full">
                                <div className="flex items-center gap-3">
                                    <HelpCircle className="h-4 w-4 text-[hsl(var(--club-muted))]" />
                                    <span className="text-sm text-[hsl(var(--club-ink))]">
                                        Help &amp; Support
                                    </span>
                                </div>
                                <ChevronRight className="h-4 w-4 text-[hsl(var(--club-muted))]" />
                            </button>
                        </CardContent>
                    </Card>
                </div>

                <Button
                    variant="outline"
                    className="w-full border-destructive/30 text-destructive hover:bg-destructive/5"
                    onClick={handleLogout}
                >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                </Button>
            </main>
        </div>
    );
}
