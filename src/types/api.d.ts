declare global {
    // Generic API wrapper
    interface ApiResponse<T> {
        message: string;
        data: T;
    }

    interface ApiMyProfileUser {
        id: string;
        name: string | null;
        phone: string;
        countryCode: string;
        role: string;
        createdAt: string;
    }

    interface ApiMyProfilePurchase {
        id: string;
        amountPaid: number;
        createdAt: string;
        package: {
            id: string;
            name: string;
            amount: number;
            tierUnlock: string | null;
        };
    }

    interface ApiMyProfileVenueMembership {
        tier: string | null;
        totalSpend: number;
        totalBookings: number;
        venue: {
            id: string;
            name: string;
            city: string;
        };
    }

    interface ApiMyProfileWallet {
        venueId: string;
        balance: number;
        venue: { id: string; name: string; city: string };
    }

    interface ApiMyProfile {
        user: ApiMyProfileUser;
        wallets: ApiMyProfileWallet[];
        totalBookings: number;
        purchases: ApiMyProfilePurchase[];
        venueMemberships: ApiMyProfileVenueMembership[];
    }

    // ── Venues ──────────────────────────────────────────────────────────────

    interface ApiVenueImage {
        id: string;
        venueId: string;
        url: string;
        altText: string | null;
        type: string;
        order: number;
        createdAt: string;
        updatedAt: string;
    }

    interface ApiVenueAmenity {
        name: string;
        icon: string | null;
    }

    interface ApiVenueSport {
        sport: string;
        minPrice: number;
    }

    interface ApiVenue {
        id: string;
        name: string;
        address: string;
        city: string;
        latitude: number | null;
        longitude: number | null;
        venueImages: ApiVenueImage[];
        venueAmenities: ApiVenueAmenity[];
        availableSports: ApiVenueSport[];
    }

    interface ApiPagination {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }

    interface ApiVenueListData {
        venues: ApiVenue[];
        pagination: ApiPagination;
    }

    interface ApiVenueListParams {
        city: string;
        sport?: string;
        search?: string;
        page?: number;
        limit?: number;
    }

    interface ApiVenueDetail extends ApiVenue {
        slug: string | null;
        state: string;
        phone: string;
        email: string;
        description: string;
        isPrivateClub: boolean;
        pointsEnabled: boolean;
        monthlyPointsAllowance: number | null;
        pointPrice: number | null;
        brandColor: string | null;
        venueHours: ApiVenueHour[];
        bookingPolicy: ApiBookingPolicy;
    }

    // ── Courts ───────────────────────────────────────────────────────────────

    interface ApiCourtImage {
        id: string;
        courtId: string;
        url: string;
        altText: string | null;
        createdAt: string;
        updatedAt: string;
    }

    interface ApiCourtPricing {
        pricePerSlot: number;
        pointsPerSlot?: number | null;
        weekendPointsPerSlot?: number | null;
    }

    interface ApiPeakHourPricing {
        id: string;
        courtId: string;
        dayOfWeek: number | null;
        startTime: string;
        endTime: string;
        pricePerSlot: number;
        pointsPerSlot?: number | null;
        label: string | null;
        isActive: boolean;
    }

    interface ApiCourt {
        id: string;
        name: string;
        sport: string;
        environment: string;
        courtImages: ApiCourtImage[];
        courtPricings: ApiCourtPricing[];
        peakHourPricings?: ApiPeakHourPricing[];
    }

    interface ApiTimeSlot {
        id: string;
        court_id: string;
        date: string;
        start_time: string;
        end_time: string;
        status: 'available' | 'booked' | 'blocked';
    }

    interface ApiSlot {
        startTime: string;
        endTime: string;
        status: 'available' | 'booked' | 'blocked' | 'held' | 'pending' | 'downtime';
    }

    interface ApiAvailability {
        isClosed: boolean;
        session1: ApiSlot[];
        session2: ApiSlot[] | null;
    }

    interface ApiCourtDetail {
        court: ApiCourt;
        availability: ApiAvailability;
        date: string;
    }

    interface ApiVenueHour {
        id: string;
        venueId: string;
        dayOfWeek: number;
        openTime: string;
        closeTime: string;
        eveningOpenTime: string | null;
        eveningCloseTime: string | null;
        isClosed: boolean;
        createdAt: string;
        updatedAt: string;
    }

    interface ApiBookingPolicy {
        id: string;
        venueId: string;
        adavanceBookingDays: number;
        minimumNoticeMinutes: number;
        cancellationPolicy: string;
        autoConfirm: boolean;
        maxBookingsPerPlayerDay: number | null;
        minimumSlotMinutes: number;
        createdAt: string;
        updatedAt: string;
    }

    interface ApiMembership {
        tier: string;
        totalSpend: number;
        totalBookings: number;
        tierProgress: {
            nextTier: string | null;
            spendRequired: number;
            bookingsRequired: number;
            remainingSpend: number;
            remainingBookings: number;
            spendProgressPct: number;
        };
        perks: string[] | null;
    }

    interface ApiVenueDetailResponse {
        venue: ApiVenueDetail;
        membership: ApiMembership;
        courtsBySport: Record<string, ApiCourt[]>;
        creditPackages: CreditPackage[];
    }

    // ── Bookings ─────────────────────────────────────────────────────────────

    interface HoldSlotBody {
        courtId: string;
        bookingDate: string;
        slots: { startTime: string; endTime: string }[];
    }

    interface CreateBookingBody {
        courtId: string;
        bookingDate: string;
        slots: { startTime: string; endTime: string }[];
        notes?: string;
        paymentMethod?: 'UPI' | 'CARD' | 'NET_BANKING';
        paymentMode?: 'POINTS';
    }

    interface VerifyBookingPaymentBody {
        razorpayPaymentId: string;
        razorpayOrderId: string;
        razorpaySignature: string;
    }

    interface ApiBooking {
        id: string;
        bookingRef: string;
        userId: string;
        courtId: string;
        venueId: string;
        bookingDate: string;
        startTime: string;
        endTime: string;
        durationMinutes: number;
        totalAmount: number;
        discountAmount: number;
        finalAmount: number;
        status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
        notes: string | null;
        cancelledAt: string | null;
        confirmedAt: string | null;
        completedAt: string | null;
        isDeleted: boolean;
        createdAt: string;
        updatedAt: string;
        court: {
            id: string;
            name: string;
            sport: string;
            environment: string;
        };
        venue: {
            id: string;
            name: string;
            address: string;
            city: string;
        };
        payment: {
            paymentStatus: string;
            paymentMethod: string;
            amount: number;
        } | null;
    }

    interface ApiBookingListData {
        bookings: ApiBooking[];
        pagination: ApiPagination;
    }

    interface ApiPointsTransaction {
        id: string;
        walletId: string;
        type: string;
        points: number;
        balanceAfter: number;
        note: string | null;
        createdAt: string;
    }

    interface ApiPointsWallet {
        id: string;
        userId: string;
        venueId: string;
        balance: number;
        monthlyAllocated: number;
        monthlyUsed: number;
        lastAllocationAt: string | null;
        transactions?: ApiPointsTransaction[];
    }

    interface BuyPointsOrderResponse {
        order: {
            orderId: string;
            amount: number;
            currency: string;
            keyId: string;
        };
        points: number;
        pricePerPoint: number;
        totalAmount: number;
    }

    interface BuyPointsVerifyBody {
        venueId: string;
        points: number;
        razorpayOrderId: string;
        razorpayPaymentId: string;
        razorpaySignature: string;
    }

    interface ApiMyClub {
        venue: {
            id: string;
            slug: string | null;
            name: string;
            city: string;
            address: string;
            description: string | null;
            monthlyPointsAllowance: number | null;
            venueImages: ApiVenueImage[];
        };
        wallet: {
            balance: number;
            monthlyAllocated: number;
            monthlyUsed: number;
        } | null;
    }

    // ── Wallet ───────────────────────────────────────────────────────────────

    interface ApiWallet {
        balance: number;
        currency: string;
    }

    interface ApiWalletTransaction {
        id: string;
        type: 'CREDIT' | 'DEBIT';
        amount: number;
        source: string;
        description: string;
        created_at: string;
    }

    interface ApiWalletTransactionsParams {
        page?: number;
        limit?: number;
        type?: 'CREDIT' | 'DEBIT';
        source?: string;
    }

    // ── Credit Packages ──────────────────────────────────────────────────────

    interface PurchaseCreditPackageBody {
        venueId?: string;
    }

    interface ApiRazorpayOrder {
        order_id: string;
        amount: number;
        currency: string;
    }

    interface ApiCreateBookingResponse {
        booking: ApiBooking;
        razorpay: {
            orderId: string;
            amount: number;
            currency: string;
            keyId: string;
        };
    }

    interface VerifyCreditPaymentBody {
        razorpayPaymentId: string;
        razorpayOrderId: string;
        razorpaySignature: string;
        packageId: string;
    }

    // ── Tier ─────────────────────────────────────────────────────────────────

    interface ApiTierConfig {
        tier_name: string;
        min_spend: number;
    }

    interface ApiTierBenefits {
        tiers: {
            name: string;
            perks: string[];
        }[];
    }

    interface ApiVenueTier {
        venue_id: string;
        current_tier: string | null;
        spend: number;
        tier_configs: ApiTierConfig[];
        otc_used: number;
        otc_limit: number;
        otc_enabled: boolean;
        rewards_enabled: boolean;
    }

    interface RazorpayOptions {
        key: string;
        amount: number;
        currency: string;
        order_id: string;
        name: string;
        description?: string;
        handler: (response: {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
        }) => void;
        modal?: { ondismiss?: () => void };
        theme?: { color?: string };
    }
}

declare class Razorpay {
    constructor(options: RazorpayOptions);
    open(): void;
}

declare global {
    interface Window {
        Razorpay: typeof Razorpay;
    }
}

export {};
