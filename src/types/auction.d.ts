declare global {
    type AuctionLotStatus = 'WAITING' | 'LIVE' | 'SOLD' | 'UNSOLD';
    type AuctionPhase = 'CATEGORIES' | 'REAUCTION';

    interface ApiAuctionTeam {
        id: string;
        name: string;
        logoUrl: string | null;
        purseInr: number;
        spentInr: number;
        remainingInr: number;
        sort: number;
        squadCount: number;
        womenCount: number;
    }

    interface ApiAuctionCategory {
        id: string;
        eventId: string;
        name: string;
        basePriceInr: number;
        retentionMultiplier: number;
        sort: number;
        createdAt: string;
    }

    interface ApiAuctionLot {
        id: string;
        entrantId: string;
        name: string;
        photoUrl: string | null;
        gender: string | null;
        sports: string[];
        padelLevel: string | null;
        pickleballLevel: string | null;
        achievements: string | null;
        categoryId: string | null;
        status: AuctionLotStatus;
        teamId: string | null;
        priceInr: number | null;
        basePriceOverrideInr: number | null;
        effectiveBasePriceInr: number;
        soldAt: string | null;
        queueOrder: number;
        reauctioned: boolean;
        retained: boolean;
    }

    interface ApiAuctionState {
        currentLotId: string | null;
        currentCategoryId: string | null;
        phase: AuctionPhase;
    }

    interface ApiAuctionTeamMember {
        id: string;
        teamId: string;
        name: string;
        phone: string;
    }

    interface ApiAuctionBoardData {
        setUp: boolean;
        teams: ApiAuctionTeam[];
        categories: ApiAuctionCategory[];
        lots: ApiAuctionLot[];
        state: ApiAuctionState;
        retentionOpen: boolean;
        /** Host console / admin only. */
        members?: ApiAuctionTeamMember[];
        /** Team view only: the logged-in team user's own team. */
        myTeamId?: string;
    }

    /** Public live screen: no purses, spend or squads. */
    interface ApiAuctionLiveData {
        setUp: boolean;
        teams: Pick<ApiAuctionTeam, 'id' | 'name' | 'logoUrl' | 'sort'>[];
        categories: ApiAuctionCategory[];
        lots: ApiAuctionLot[];
        state: ApiAuctionState;
        retentionOpen: boolean;
        counts: {
            total: number;
            sold: number;
            byCategory: { categoryId: string; total: number; waiting: number }[];
        };
    }

    interface ApiAuctionTransaction {
        id: string;
        eventId: string;
        kind: string;
        lotId: string | null;
        teamId: string | null;
        amountInr: number | null;
        details: string;
        createdAt: string;
    }

    interface ApiAuctionTransactionsData {
        transactions: ApiAuctionTransaction[];
    }
}

export {};
