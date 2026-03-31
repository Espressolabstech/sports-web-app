declare global {
    interface PurchasedPackage {
        id: string;
        package_name: string;
        venue_name: string;
        cash_amount: number;
        credit_value: number;
        tier_grant: string | null;
        purchased_at: string;
    }

    interface VenueTierData {
        venue_id: string;
        venue_name: string;
        current_tier: string;
        previous_tier: string | null;
        grace_period_ends_at: string | null;
        window_cash_paid: number;
        next_recalculation_at: string;
        next_tier_spend?: number;
        hold_used: number;
        hold_limit: number;
        hold_enabled: boolean;
        otc_used: number;
        otc_limit: number;
        otc_enabled: boolean;
        rewards_enabled: boolean;
    }

    interface PlayerTierStatusWidgetProps {
        playerId: string;
    }
}

export {};
