export const endpoints = {
    // Auth
    me: '/auth/me',
    login: '/user-login',
    verifyOtp: '/verify-otp',
    resendOtp: '/resend-otp',
    updateName: '/user/update-name',

    // Home / Venue Discovery
    venues: '/home/venues',
    venueDetail: (venueId: string) => `/home/venues/${venueId}`,
    courtDetail: (courtId: string) => `/home/courts/${courtId}`,

    // Bookings
    holdSlot: '/bookings/hold',
    initiatePayment: (bookingId: string) => `/bookings/${bookingId}/initiate-payment`,
    createBooking: '/bookings/create',
    verifyBookingPayment: (bookingId: string) =>
        `/bookings/${bookingId}/verify-payment`,
    cancelBooking: (bookingId: string) => `/bookings/${bookingId}/cancel`,
    myBookings: '/bookings/my',
    bookingDetail: (bookingId: string) => `/bookings/${bookingId}`,

    // My Bookings (Dedicated)
    upcomingBookings: '/my-bookings/upcoming',
    pastBookings: '/my-bookings/past',

    // Wallet
    wallet: '/wallet',
    walletTransactions: '/wallet/transactions',

    // Credit Packages
    creditPackages: '/credit-packages',
    purchaseCreditPackage: (id: string) => `/credit-packages/${id}/purchase`,
    verifyCreditPayment: '/credit-packages/verify-payment',

    // Tier / Membership
    tierBenefits: '/tier/benefits',
    tierByVenue: (venueId: string) => `/tier/${venueId}`,
};
