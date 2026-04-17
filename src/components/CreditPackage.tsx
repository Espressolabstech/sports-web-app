import { useState } from 'react';
import { toast } from 'sonner';
import { ChevronRight, Wallet } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from './ui/alert-dialog';
import {
    purchaseCreditPackage,
    verifyCreditPayment,
} from '../api/adapters/creditPackages';

const TIER_COLORS: Record<string, string> = {
    PRO: 'bg-emerald-500/10 text-emerald-600',
    ELITE: 'bg-violet-500/10 text-violet-600',
    CLUB: 'bg-blue-500/10 text-blue-600',
};

export function CreditPackages({
    packages,
    venueName,
    venueId,
    isLoggedIn,
    onLoginRequired,
}: CreditPackagesProps) {
    const [confirmPkg, setConfirmPkg] = useState<CreditPackage | null>(null);
    const [purchasing, setPurchasing] = useState(false);
    const [expanded, setExpanded] = useState(false);

    if (packages.length === 0) return null;

    const handleBuy = (pkg: CreditPackage) => {
        if (!isLoggedIn) {
            onLoginRequired();
            return;
        }
        setConfirmPkg(pkg);
    };

    const handleConfirmPurchase = async () => {
        if (!confirmPkg) return;
        setPurchasing(true);
        try {
            const res = await purchaseCreditPackage(confirmPkg.id, { venueId });
            const { razorpay } = res.data as any;

            const options: RazorpayOptions = {
                key: razorpay.keyId,
                amount: razorpay.amount,
                currency: razorpay.currency,
                order_id: razorpay.orderId,
                name: venueName,
                description: confirmPkg.name,
                handler: async (response) => {
                    try {
                        await verifyCreditPayment({
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpayOrderId: response.razorpay_order_id,
                            razorpaySignature: response.razorpay_signature,
                            packageId: confirmPkg.id,
                        });
                        toast.success('Credits added to your wallet!', {
                            description: `₹${Number(confirmPkg.amount).toLocaleString('en-IN')} credits are ready to use at ${venueName}.`,
                        });
                    } catch {
                        toast.error('Payment verification failed', {
                            description: 'Please contact support with your payment ID.',
                        });
                    }
                },
                modal: {
                    ondismiss: () => {
                        toast.info('Payment cancelled');
                    },
                },
                theme: { color: '#2563eb' },
            };

            const rzp = new window.Razorpay(options);
            setExpanded(false);
            rzp.open();
        } catch (err: any) {
            toast.error('Could not initiate purchase', {
                description: err?.message || 'Please try again.',
            });
        } finally {
            setPurchasing(false);
            setConfirmPkg(null);
        }
    };

    return (
        <section className="mb-6">
            {/* Collapsed summary row */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between gap-3 rounded-xl border bg-card p-4 hover:bg-accent/50 transition-colors text-left"
            >
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                        <Wallet className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-foreground">
                            Credit Packages
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Top up your wallet · {packages.length} package
                            {packages.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
                <ChevronRight
                    className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
                />
            </button>

            {/* Expanded packages */}
            {expanded && (
                <div className="mt-2 space-y-2">
                    {packages.map((pkg) => (
                        <Card key={pkg.id} className="overflow-hidden">
                            <CardContent className="p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <p className="font-semibold text-foreground text-sm">
                                                {pkg.name}
                                            </p>
                                            {pkg.tierUnlock && (
                                                <Badge
                                                    variant="secondary"
                                                    className={`text-[10px] px-1.5 py-0 capitalize ${TIER_COLORS[pkg.tierUnlock] ?? ''}`}
                                                >
                                                    Unlocks {pkg.tierUnlock.toLowerCase()}
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            ₹{Number(pkg.amount).toLocaleString('en-IN')} added to wallet
                                            {pkg.tierUnlock && ` + unlock ${pkg.tierUnlock.toLowerCase()} perks`}
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => handleBuy(pkg)}
                                        className="shrink-0 h-8 text-xs"
                                    >
                                        Buy ₹{Number(pkg.amount).toLocaleString('en-IN')}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Purchase Confirmation Dialog */}
            <AlertDialog
                open={!!confirmPkg}
                onOpenChange={(open) => !open && setConfirmPkg(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Purchase</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-2">
                                <p>
                                    Pay{' '}
                                    <strong className="text-foreground">
                                        ₹{Number(confirmPkg?.amount).toLocaleString('en-IN')}
                                    </strong>{' '}
                                    to add{' '}
                                    <strong className="text-foreground">
                                        ₹{Number(confirmPkg?.amount).toLocaleString('en-IN')}
                                    </strong>{' '}
                                    in credits at{' '}
                                    <strong className="text-foreground">
                                        {venueName}
                                    </strong>
                                    .
                                </p>
                                <p className="text-xs">
                                    Credits never expire and can be used for any booking at this venue.
                                </p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={purchasing}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmPurchase}
                            disabled={purchasing}
                        >
                            {purchasing ? 'Processing…' : `Pay ₹${Number(confirmPkg?.amount).toLocaleString('en-IN')}`}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </section>
    );
}
