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
        source: 'REGISTRATION' | 'WALK_IN';
        createdAt: string;
        updatedAt: string;
    }

    interface ApiEventMatch {
        id: string;
        roundId: string;
        court: number;
        teamAEntrant1Id: string;
        teamAEntrant2Id: string;
        teamBEntrant1Id: string;
        teamBEntrant2Id: string;
        scoreA: number | null;
        scoreB: number | null;
    }

    interface ApiEventRound {
        id: string;
        eventId: string;
        roundNumber: number;
        resting: string[];
        matches: ApiEventMatch[];
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
        skillLevels: ApiEventEntrant['skill'][];
        posterUrl: string | null;
        priceInr: number;
        upiId: string | null;
        phase: 'DRAFT' | 'PUBLISHED' | 'LIVE' | 'COMPLETED';
        createdAt: string;
        updatedAt: string;
        entrants: ApiEventEntrant[];
        rounds?: ApiEventRound[];
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
        entrant: ApiEventEntrant;
        ticketCode: string;
        waitlisted: boolean;
        razorpay: ApiEventRazorpayOrder | null;
    }

    interface VerifyEventPaymentBody {
        razorpayOrderId: string;
        razorpayPaymentId: string;
        razorpaySignature: string;
    }
}

export {};
