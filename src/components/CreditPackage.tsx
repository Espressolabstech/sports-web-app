import { CheckCircle2, ChevronRight, Wallet } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
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
            // In production, this would open Razorpay checkout
            // For now, simulate the purchase flow
            toast.success(`Purchase initiated for ${confirmPkg.name}`, {
                description: `₹${confirmPkg.cash_amount} payment via Razorpay`,
            });
        } catch (err: any) {
            toast.error('Purchase failed', {
                description:
                    err?.message || 'Please try again or contact support.',
            });
        } finally {
            setPurchasing(false);
            setConfirmPkg(null);
        }
    };

    const bestDiscount = Math.max(
        ...packages.map((p) =>
            Math.round(
                ((p.credit_value - p.cash_amount) / p.credit_value) * 100,
            ),
        ),
    );

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
                            Up to {bestDiscount}% extra credits ·{' '}
                            {packages.length} package
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
                    {packages.map((pkg) => {
                        const discountPercent = Math.round(
                            ((pkg.credit_value - pkg.cash_amount) /
                                pkg.credit_value) *
                                100,
                        );
                        return (
                            <Card key={pkg.id} className="overflow-hidden">
                                <CardContent className="p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <p className="font-semibold text-foreground text-sm">
                                                    {pkg.name}
                                                </p>
                                                <Badge
                                                    variant="secondary"
                                                    className="text-[10px] bg-success/10 text-success border-0 px-1.5 py-0"
                                                >
                                                    +{discountPercent}%
                                                </Badge>
                                                {pkg.tier_grant && (
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px] px-1.5 py-0 capitalize"
                                                    >
                                                        → {pkg.tier_grant} Tier
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Pay ₹{pkg.cash_amount} → Get ₹
                                                {pkg.credit_value}
                                                {pkg.tier_grant &&
                                                    ` + unlock ${pkg.tier_grant} perks`}
                                            </p>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="default"
                                            onClick={() => handleBuy(pkg)}
                                            className="shrink-0 h-8 text-xs"
                                        >
                                            Buy
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Purchase Confirmation Dialog */}
            <AlertDialog
                open={!!confirmPkg}
                onOpenChange={(open) => !open && setConfirmPkg(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                            Confirm Purchase
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3">
                                <p>
                                    You are paying{' '}
                                    <strong className="text-foreground">
                                        ₹{confirmPkg?.cash_amount}
                                    </strong>{' '}
                                    and will receive{' '}
                                    <strong className="text-foreground">
                                        ₹{confirmPkg?.credit_value}
                                    </strong>{' '}
                                    in court credits at{' '}
                                    <strong className="text-foreground">
                                        {venueName}
                                    </strong>
                                    .
                                </p>
                                <p className="text-xs">
                                    Credits never expire and can be used for any
                                    booking at this venue.
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
                            {purchasing
                                ? 'Processing...'
                                : `Pay ₹${confirmPkg?.cash_amount}`}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </section>
    );
}
