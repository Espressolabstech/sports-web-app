import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useClub } from './ClubContext';
import { buyPoints, verifyBuyPoints } from '../../api/adapters/pointsWallet';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

export default function ClubCredits() {
    const navigate = useNavigate();
    const { venueId } = useParams();
    const { wallet, monthlyPointsAllowance, venueId: realVenueId, pointPrice, brandColor, refetchWallet } = useClub();

    const [buyOpen, setBuyOpen] = useState(false);
    const [quantity, setQuantity] = useState(100);

    const balance = wallet?.balance ?? 0;
    const allocated = wallet?.monthlyAllocated ?? 0;
    const used = wallet?.monthlyUsed ?? 0;
    const total = monthlyPointsAllowance || allocated || 0;

    // Credits above the monthly remaining = purchased top-ups
    const monthlyRemaining = Math.max(0, allocated - used);
    const purchased = Math.max(0, balance - monthlyRemaining);
    const hasPurchased = purchased > 0;

    const pct = total > 0 ? Math.min(100, Math.round((monthlyRemaining / total) * 100)) : 0;

    const { mutate: initBuy, isPending: initiating } = useMutation({
        mutationFn: () => buyPoints({ venueId: realVenueId, points: quantity }),
        onSuccess: (data) => {
            const { order, points: pts } = data.data;
            const rzp = new window.Razorpay({
                key: order.keyId,
                amount: order.amount,
                currency: order.currency,
                order_id: order.orderId,
                name: 'Buy Credits',
                description: `${pts} credits`,
                handler: async (response) => {
                    try {
                        await verifyBuyPoints({
                            venueId: realVenueId,
                            points: pts,
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                        });
                        toast.success(`${pts} credits added to your wallet`);
                        refetchWallet();
                        setBuyOpen(false);
                    } catch {
                        toast.error('Payment verification failed. Contact support.');
                    }
                },
                modal: { ondismiss: () => {} },
                theme: { color: brandColor },
            });
            rzp.open();
        },
        onError: (err: Error) => toast.error(err.message),
    });

    return (
        <div>
            <header className="border-b border-[hsl(var(--club-border))] bg-[hsl(var(--club-surface))] px-5 py-4">
                <div className="mx-auto flex max-w-3xl items-center gap-3">
                    <button
                        onClick={() => navigate(`/club/${venueId}`)}
                        className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[hsl(var(--club-bg))]"
                        aria-label="Back"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <h1 className="font-serif text-xl font-semibold text-[hsl(var(--club-ink))]">
                        Member credits
                    </h1>
                </div>
            </header>

            <main className="mx-auto max-w-3xl space-y-6 px-5 py-6">
                {/* Balance card */}
                <section className="rounded-2xl border border-[hsl(var(--club-border))] bg-[hsl(var(--club-surface))] p-6">
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[hsl(var(--club-muted))]">
                        Total available
                    </p>
                    <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                        <span className="font-serif text-5xl font-semibold tabular-nums text-[hsl(var(--club-ink))]">
                            {balance.toLocaleString()}
                        </span>
                        {total > 0 && (
                            <span className="text-sm text-[hsl(var(--club-muted))]">
                                credits
                            </span>
                        )}
                    </div>

                    {/* Monthly allocation breakdown */}
                    {total > 0 && (
                        <div className="mt-5 space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-[hsl(var(--club-muted))]">Monthly allocation</span>
                                <span className="font-medium text-[hsl(var(--club-ink))]">
                                    {monthlyRemaining.toLocaleString()} / {total.toLocaleString()}
                                </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-[hsl(var(--club-border))]">
                                <div
                                    className="h-full rounded-full transition-all"
                                    style={{ width: `${pct}%`, background: brandColor }}
                                />
                            </div>
                            <div className="flex items-center justify-between text-xs text-[hsl(var(--club-muted))]">
                                <span>{used.toLocaleString()} used this month</span>
                                <span>{Math.max(0, total - used).toLocaleString()} from allocation</span>
                            </div>
                        </div>
                    )}

                    {/* Purchased credits row */}
                    {hasPurchased && (
                        <div className="mt-4 flex items-center gap-3 rounded-xl bg-[hsl(var(--club-bg))] px-4 py-3">
                            <div
                                className="flex h-8 w-8 items-center justify-center rounded-full text-white"
                                style={{ background: brandColor }}
                            >
                                <ShoppingBag className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-[hsl(var(--club-ink))]">
                                    {purchased.toLocaleString()} purchased credits
                                </p>
                                <p className="text-xs text-[hsl(var(--club-muted))]">
                                    Extra top-up · never expires
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Buy button */}
                    {pointPrice && pointPrice > 0 && (
                        <button
                            onClick={() => setBuyOpen(true)}
                            className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-[0_6px_16px_-6px_rgba(0,0,0,0.3)]"
                            style={{ background: brandColor }}
                        >
                            <Plus className="h-4 w-4" />
                            Buy more credits · ₹{pointPrice}/credit
                        </button>
                    )}
                </section>

                {/* Usage summary */}
                {wallet && (
                    <section>
                        <h2 className="mb-3 px-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[hsl(var(--club-muted))]">
                            This month's summary
                        </h2>
                        <div className="overflow-hidden rounded-2xl border border-[hsl(var(--club-border))] bg-[hsl(var(--club-surface))] divide-y divide-[hsl(var(--club-border))]">
                            <div className="flex items-center gap-4 px-5 py-4">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--club-bg))]">
                                    <CalendarDays className="h-4 w-4 text-[hsl(var(--club-muted))]" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-[hsl(var(--club-ink))]">
                                        Monthly allocation
                                    </p>
                                    <p className="text-xs text-[hsl(var(--club-muted))]">
                                        Reset every month
                                    </p>
                                </div>
                                <span className="text-sm font-semibold tabular-nums" style={{ color: brandColor }}>
                                    +{allocated.toLocaleString()}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 px-5 py-4">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--club-bg))]">
                                    <CalendarDays className="h-4 w-4 text-[hsl(var(--club-muted))]" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-[hsl(var(--club-ink))]">
                                        Used for bookings
                                    </p>
                                    <p className="text-xs text-[hsl(var(--club-muted))]">
                                        {used > 0 ? 'This month' : 'No bookings yet'}
                                    </p>
                                </div>
                                <span className="text-sm font-semibold tabular-nums text-[hsl(var(--club-ink))]">
                                    −{used.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </section>
                )}
            </main>

            {/* Buy credits sheet */}
            {buyOpen && pointPrice && (
                <div
                    className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-end sm:place-items-center"
                    onClick={() => setBuyOpen(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="w-full sm:max-w-sm bg-[hsl(var(--club-surface))] rounded-t-2xl sm:rounded-2xl p-6 border border-[hsl(var(--club-border))] space-y-5"
                    >
                        <div>
                            <h3 className="font-serif text-lg text-[hsl(var(--club-ink))]">Buy credits</h3>
                            <p className="text-sm text-[hsl(var(--club-muted))] mt-1">
                                ₹{pointPrice} per credit · added to your wallet instantly
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setQuantity((q) => Math.max(10, q - 10))}
                                className="flex h-10 w-10 items-center justify-center rounded-full border border-[hsl(var(--club-border))] hover:bg-[hsl(var(--club-bg))]"
                            >
                                <Minus className="h-4 w-4" />
                            </button>
                            <Input
                                type="number"
                                min={10}
                                step={10}
                                value={quantity}
                                onChange={(e) =>
                                    setQuantity(Math.max(10, parseInt(e.target.value) || 10))
                                }
                                className="text-center text-lg font-semibold h-12 bg-[hsl(var(--club-bg))] border-[hsl(var(--club-border))] rounded-xl"
                            />
                            <button
                                onClick={() => setQuantity((q) => q + 10)}
                                className="flex h-10 w-10 items-center justify-center rounded-full border border-[hsl(var(--club-border))] hover:bg-[hsl(var(--club-bg))]"
                            >
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="flex items-center justify-between rounded-xl bg-[hsl(var(--club-bg))] px-4 py-3 text-sm">
                            <span className="text-[hsl(var(--club-muted))]">Total payable</span>
                            <span className="font-semibold text-[hsl(var(--club-ink))]">
                                ₹{(pointPrice * quantity).toLocaleString()}
                            </span>
                        </div>

                        <Button
                            onClick={() => initBuy()}
                            disabled={initiating || quantity < 10}
                            className="w-full h-12 rounded-xl text-white font-semibold text-xs uppercase tracking-[0.18em]"
                            style={{ background: brandColor }}
                        >
                            {initiating ? 'Preparing…' : `Pay ₹${(pointPrice * quantity).toLocaleString()}`}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
