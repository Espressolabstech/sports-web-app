declare global {
    interface CreditPackage {
        id: string;
        name: string;
        cash_amount: number;
        credit_value: number;
        description: string | null;
        tier_grant?: string | null;
    }

    interface CreditPackagesProps {
        packages: CreditPackage[];
        venueName: string; 
        venueId: string;
        isLoggedIn: boolean;
        onLoginRequired: () => void;
    }

    interface TierPerkInfo {
        key: string;
        name: string;
        icon: React.ReactNode;
        shortLabel: string;
        description: string;
        howItWorks: string[];
    }
}

export {};
