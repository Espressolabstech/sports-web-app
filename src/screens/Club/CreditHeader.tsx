import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useClub } from './ClubContext';

interface Props {
    compact?: boolean;
}

export function CreditHeader({ compact }: Props) {
    const { wallet, monthlyPointsAllowance, brandColor } = useClub();
    const navigate = useNavigate();
    const { venueId } = useParams();

    const balance = wallet?.balance ?? 0;
    const allocated = wallet?.monthlyAllocated ?? 0;
    const used = wallet?.monthlyUsed ?? 0;
    const total = monthlyPointsAllowance || allocated || 0;

    // Credits above the monthly allocation = purchased top-ups
    const monthlyRemaining = Math.max(0, allocated - used);
    const purchased = Math.max(0, balance - monthlyRemaining);
    const hasPurchased = purchased > 0;

    const pct = total > 0 ? Math.min(100, Math.round((monthlyRemaining / total) * 100)) : 0;

    return (
        <div
            className={`sticky top-0 z-30 border-b border-[hsl(var(--club-border))] bg-[hsl(var(--club-surface))]/95 backdrop-blur ${
                compact ? 'py-2.5' : 'py-3'
            }`}
        >
            <button
                onClick={() => navigate(`/club/${venueId}/credits`)}
                className="group mx-auto flex w-full max-w-3xl items-center gap-4 px-5 text-left transition-opacity hover:opacity-90"
                aria-label="View credit history"
            >
                <div className="flex-1">
                    <div className="flex items-baseline justify-between">
                        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[hsl(var(--club-muted))]">
                            Credits
                        </span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="font-semibold tabular-nums text-[hsl(var(--club-ink))]">
                                {balance.toLocaleString()}
                            </span>
                            {total > 0 && (
                                <span className="text-[hsl(var(--club-muted))] font-normal text-sm">
                                    / {total.toLocaleString()}
                                </span>
                            )}
                            {hasPurchased && (
                                <span
                                    className="text-[10px] font-semibold rounded-full px-1.5 py-0.5 text-white"
                                    style={{ background: brandColor }}
                                >
                                    +{purchased.toLocaleString()} bought
                                </span>
                            )}
                        </div>
                    </div>
                    {total > 0 && (
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[hsl(var(--club-border))]">
                            <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${pct}%`, background: brandColor }}
                            />
                        </div>
                    )}
                    {!compact && (
                        <div className="mt-1.5 flex items-center justify-between text-[11px] text-[hsl(var(--club-muted))]">
                            <span>
                                {used > 0 ? `${used.toLocaleString()} used this month` : 'No usage this month'}
                            </span>
                            <span className="inline-flex items-center gap-0.5">
                                Details
                                <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                            </span>
                        </div>
                    )}
                </div>
            </button>
        </div>
    );
}
