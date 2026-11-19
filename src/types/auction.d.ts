declare global {
    type AuctionLotStatus = 'WAITING' | 'LIVE' | 'SOLD' | 'UNSOLD';
    type AuctionPhase = 'CATEGORIES' | 'REAUCTION';
    /** Manual auction rounds (any order). */
    type AuctionRound = 'ab' | 'female' | 'c' | 'd';

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

    /** What a team user or the public screen may see of a player: no levels, achievements, photo or contact details. */
    interface ApiAuctionLot {
        id: string;
        /** Draw number. */
        number: number | null;
        name: string;
        gender?: string | null;
        /** Only the player on the block and the last one sold carry a photo on the public live board. */
        photoUrl?: string | null;
        categoryId: string | null;
        status: AuctionLotStatus;
        teamId: string | null;
        priceInr: number | null;
        effectiveBasePriceInr: number;
        soldAt: string | null;
        reauctioned: boolean;
        retained: boolean;
        corrected: boolean;
        /** Only the player on the block carries gender and levels on the public live board. */
        padelLevel?: AuctionSkillLevel | null;
        pickleballLevel?: AuctionSkillLevel | null;
    }

    interface ApiAuctionState {
        currentLotId: string | null;
        currentCategoryId: string | null;
        phase: AuctionPhase;
        /** The open round; null = not started; 'complete' = auction closed. */
        round?: AuctionRound | 'complete' | null;
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

    /** The light public view: numbers, names, categories and money only. */
    interface ApiAuctionPublicTeam {
        id: string;
        name: string;
        logo: string | null;
        purse: number;
        spent: number;
        players: number;
        women: number;
    }
    interface ApiAuctionPublicLot {
        id: string;
        number: number | null;
        name: string;
        category: string | null;
        status: AuctionLotStatus;
        team: string | null;
        price: number | null;
        retained: boolean;
        soldAt: string | null;
        corrected: boolean;
        woman: boolean;
    }
    /** The public Squads view's player card: photo, levels and what the player wrote for the auction. */
    interface ApiAuctionPlayerCard {
        id: string;
        photoUrl: string | null;
        gender: string | null;
        sports: string[];
        padelLevel: AuctionSkillLevel | null;
        pickleballLevel: AuctionSkillLevel | null;
        /** True when the organizer confirmed the levels (host rated); false = what the player picked at registration. */
        levelsConfirmed: boolean;
        /** Who rated them (host rated only), e.g. "Amar". */
        levelsConfirmedBy?: string | null;
        achievements: string | null;
    }
    interface ApiAuctionPublicView {
        version: string;
        onBlock: string | null;
        teams: ApiAuctionPublicTeam[];
        lots: ApiAuctionPublicLot[];
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
