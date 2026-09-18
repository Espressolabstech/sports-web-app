declare global {
    interface ApiEventHost {
        name: string;
        phone?: string;
        instagram?: string;
        photoUrl?: string;
        description?: string;
    }

    interface ApiEventEntrant {
        id: string;
        eventId: string;
        name: string;
        phone: string | null;
        skill: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
        paid: boolean;
        checkedIn: boolean;
        /** Registered after capacity was full. Never scheduled, never on standings — until the organizer promotes them. */
        waitlisted: boolean;
        source: 'REGISTRATION' | 'WALK_IN';
        createdAt: string;
        updatedAt: string;
    }

    /**
     * A match. Americano: a slot in the rolling court queue — progression is
     * driven by `queueIndex` + `state`, not a round lifecycle. Mexicano:
     * every match in a round is `ACTIVE` at once and only advances when the
     * host closes the round (see `ApiEventMexicanoRound`).
     */
    interface ApiEventMatch {
        id: string;
        eventId: string;
        queueIndex: number;
        /** Display grouping (e.g. "Round 3"). For Mexicano this IS the round the match belongs to. */
        roundNumber: number;
        state: 'QUEUED' | 'ACTIVE' | 'COMPLETED';
        court: number | null;
        teamAEntrant1Id: string;
        teamAEntrant2Id: string;
        teamBEntrant1Id: string;
        teamBEntrant2Id: string;
        scoreA: number | null;
        scoreB: number | null;
        /** Mexicano only: the pairing rule that produced this match, e.g. "Random draw" or "1st + 4th v 2nd + 3rd". */
        drawTag: string | null;
    }

    /** Mexicano only: one row per round — who's sitting out, and whether it's closed (scores locked, next round drawn). */
    interface ApiEventMexicanoRound {
        id: string;
        eventId: string;
        roundNumber: number;
        resting: string[];
        closed: boolean;
    }

    interface ApiEvent {
        id: string;
        organizerId: string;
        slug: string;
        title: string;
        description: string | null;
        sport: 'PADEL' | 'PICKLEBALL';
        format: string;
        venueName: string;
        venueArea: string | null;
        eventDate: string;
        time: string;
        endTime: string | null;
        capacity: number;
        courts: number;
        roundMinutes: number;
        pointsPerRound: number;
        registrationClosesHours: number;
        /** One tournament is hosted for exactly one skill level. */
        skillLevel: ApiEventEntrant['skill'];
        /** When on, a match can't be tied — the winning pair earns +2 bonus points. */
        goldenPoint: boolean;
        posterUrl: string | null;
        priceInr: number;
        upiId: string | null;
        phase: 'DRAFT' | 'PUBLISHED' | 'LIVE' | 'COMPLETED';
        startedAt: string | null;
        plannedRounds: number | null;
        createdAt: string;
        updatedAt: string;
        entrants: ApiEventEntrant[];
        matches: ApiEventMatch[];
        mexicanoRounds: ApiEventMexicanoRound[];
        hosts: ApiEventHost[];
    }

    interface ApiEventListData {
        events: ApiEvent[];
    }

    interface ApiEventDetailData {
        event: ApiEvent;
    }

    interface RegisterForEventBody {
        name: string;
        phone: string;
        skill?: ApiEventEntrant['skill'];
    }

    interface ApiEventRazorpayOrder {
        orderId: string;
        amount: number;
        currency: string;
        keyId: string;
    }

    interface ApiEventRegistrationData {
        // null while a paid registration is still waiting on payment —
        // the entrant is only created once confirmPayment verifies it.
        entrant: ApiEventEntrant | null;
        ticketCode: string | null;
        waitlisted: boolean;
        pending: boolean;
        razorpay: ApiEventRazorpayOrder | null;
    }

    interface ConfirmEventPaymentBody {
        name: string;
        phone: string;
        skill?: ApiEventEntrant['skill'];
        razorpayOrderId: string;
        razorpayPaymentId: string;
        razorpaySignature: string;
    }

    interface ApiEventPaymentConfirmationData {
        entrant: ApiEventEntrant;
        ticketCode: string;
        waitlisted: boolean;
    }
}

export {};
