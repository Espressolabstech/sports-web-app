import { useQuery } from '@tanstack/react-query';
import { Skeleton } from './ui/skeleton';
import { Clock, Shield, Unlock, Lock } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { format } from 'date-fns';
import { Badge } from './ui/badge';
import { cn } from '../utils/twMerge';
import { TIER_COLORS, TIER_LABELS } from '../utils/mockData';
import { Progress } from '@radix-ui/react-progress';

export function PlayerTierStatusWidget({
    playerId,
}: PlayerTierStatusWidgetProps) {
    const { data: tierData, isLoading } = useQuery({
        queryKey: ['player-tier-status', playerId],
        queryFn: async () => {
            // Temporary dummy data while backend is not wired.
            await new Promise((r) => setTimeout(r, 120)); // simulate network
            const now = new Date();
            const nextRec = new Date(
                now.getFullYear(),
                now.getMonth() + 1,
                1,
            ).toISOString();

            return [
                {
                    venue_id: '1',
                    venue_name: 'Padel Arena Dubai',
                    current_tier: 'pro',
                    previous_tier: 'club',
                    grace_period_ends_at: new Date(
                        now.getTime() + 1000 * 60 * 60 * 24 * 7,
                    ).toISOString(),
                    window_cash_paid: 1200,
                    next_recalculation_at: nextRec,
                    next_tier_spend: 2500,
                    hold_used: 1,
                    hold_limit: 2,
                    hold_enabled: true,
                    otc_used: 0,
                    otc_limit: 2,
                    otc_enabled: true,
                    rewards_enabled: true,
                },
                {
                    venue_id: '2',
                    venue_name: 'SportCity Courts',
                    current_tier: 'elite',
                    previous_tier: 'pro',
                    grace_period_ends_at: null,
                    window_cash_paid: 8000,
                    next_recalculation_at: nextRec,
                    next_tier_spend: undefined,
                    hold_used: 0,
                    hold_limit: 2,
                    hold_enabled: false,
                    otc_used: 1,
                    otc_limit: 2,
                    otc_enabled: true,
                    rewards_enabled: true,
                },
            ];
        },
        enabled: !!playerId,
    });

    if (isLoading) {
        return (
            <div className="space-y-3">
                <Skeleton className="h-36 w-full rounded-xl" />
                <Skeleton className="h-36 w-full rounded-xl" />
            </div>
        );
    }

    if (!tierData || tierData.length === 0) return null;

    return (
        <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Tier Status
            </h2>
            {tierData.map((vt) => {
                const isMaxTier = vt.current_tier === 'elite';
                const inGracePeriod =
                    vt.grace_period_ends_at &&
                    new Date(vt.grace_period_ends_at) > new Date();
                const spendProgress = vt.next_tier_spend
                    ? Math.min(
                          100,
                          (vt.window_cash_paid / vt.next_tier_spend) * 100,
                      )
                    : 100;

                return (
                    <Card key={vt.venue_id} className="overflow-hidden">
                        <CardContent className="p-4 space-y-3">
                            {/* Header */}
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="font-semibold text-foreground">
                                        {vt.venue_name}
                                    </p>
                                    {inGracePeriod && vt.previous_tier && (
                                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                            <Clock className="h-3 w-3" />
                                            Benefits continue until{' '}
                                            {format(
                                                new Date(
                                                    vt.grace_period_ends_at!,
                                                ),
                                                'MMM d, yyyy',
                                            )}
                                        </p>
                                    )}
                                </div>
                                <Badge
                                    className={cn(
                                        'text-xs font-semibold',
                                        TIER_COLORS[
                                            inGracePeriod && vt.previous_tier
                                                ? vt.previous_tier
                                                : vt.current_tier
                                        ],
                                    )}
                                >
                                    {
                                        TIER_LABELS[
                                            inGracePeriod && vt.previous_tier
                                                ? vt.previous_tier
                                                : vt.current_tier
                                        ]
                                    }
                                </Badge>
                            </div>

                            {/* Progress toward next tier */}
                            {isMaxTier ? (
                                <p className="text-xs font-medium text-primary">
                                    ✦ Maximum tier — {vt.venue_name}
                                </p>
                            ) : vt.next_tier_spend != null ? (
                                <div className="space-y-2">
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-muted-foreground">
                                                Spend
                                            </span>
                                            <span className="font-medium text-foreground">
                                                ₹{vt.window_cash_paid} / ₹
                                                {vt.next_tier_spend}
                                            </span>
                                        </div>
                                        <Progress
                                            value={spendProgress}
                                            className="h-1.5"
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">
                                        Resets{' '}
                                        {format(
                                            new Date(vt.next_recalculation_at),
                                            'MMM d, yyyy',
                                        )}
                                    </p>
                                </div>
                            ) : null}

                            {/* Monthly usage counters */}
                            {(vt.hold_enabled || vt.otc_enabled) && (
                                <div className="flex gap-4 pt-1 border-t border-border">
                                    {vt.hold_enabled && (
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Lock className="h-3 w-3" />
                                            Hold: {vt.hold_used} of{' '}
                                            {vt.hold_limit} used
                                        </div>
                                    )}
                                    {vt.otc_enabled && (
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Unlock className="h-3 w-3" />
                                            OTC: {vt.otc_used} of 2 used
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
