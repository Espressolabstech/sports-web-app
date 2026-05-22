export const mockFacilities = [
    {
        id: '1',
        name: 'Padel Arena Dubai',
        location: 'Al Quoz, Dubai',
        city: 'Dubai',
        type: 'sports' as const,
        description:
            'Premium padel courts with professional-grade surfaces. Indoor and outdoor courts available with floodlights for evening play.',
        image_url:
            'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=600&h=400&fit=crop',
        sports: ['Padel', 'Pickleball'],
        amenities: ['Parking', 'Changing Rooms', 'Cafe', 'Pro Shop'],
    },
    {
        id: '2',
        name: 'SportCity Courts',
        location: 'Downtown, Dubai',
        city: 'Dubai',
        type: 'sports' as const,
        description:
            'Multi-sport facility featuring top-quality courts for padel and pickleball.',
        image_url:
            'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?w=600&h=400&fit=crop',
        sports: ['Padel', 'Pickleball'],
        amenities: ['Parking', 'Showers', 'Coaching'],
    },
    {
        id: '3',
        name: 'Green Valley Padel',
        location: 'JLT, Dubai',
        city: 'Dubai',
        type: 'sports' as const,
        description:
            'Community-focused padel club with courts for all skill levels.',
        image_url:
            'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=600&h=400&fit=crop',
        sports: ['Padel'],
        amenities: ['Parking', 'Water Station'],
    },
    {
        id: '4',
        name: 'Marina Racquet Club',
        location: 'Dubai Marina, Dubai',
        city: 'Dubai',
        type: 'sports' as const,
        description:
            'Waterfront racquet sports club with stunning marina views. Premium padel and pickleball facilities.',
        image_url:
            'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=600&h=400&fit=crop',
        sports: ['Padel', 'Pickleball'],
        amenities: ['Parking', 'Locker Rooms', 'Cafe', 'Showers', 'Coaching'],
    },
];

const today = new Date().toISOString().split('T')[0];

export const mockPlayers = [
    {
        id: 'p1',
        name: 'Ahmad Hassan',
        email: 'ahmad@email.com',
        phone: '+971 50 123 4567',
    },
    {
        id: 'p2',
        name: 'Sarah Johnson',
        email: 'sarah@email.com',
        phone: '+971 55 234 5678',
    },
    {
        id: 'p3',
        name: 'Mike Chen',
        email: 'mike@email.com',
        phone: '+971 52 345 6789',
    },
    {
        id: 'p4',
        name: 'Fatima Al-Said',
        email: 'fatima@email.com',
        phone: '+971 56 456 7890',
    },
];

export const mockBookings: MockBooking[] = [
    {
        id: 'b1',
        time_slot_id: `ts-c1-${today}-8`,
        player_id: 'p1',
        player: mockPlayers[0],
        status: 'confirmed',
        court_fee: 150,
        booking_fee: 15,
        gst: 8.25,
        total: 173.25,
        amount_paid: 173.25,
        payment_method: 'card_online',
        court_name: 'Court 1',
        facility_name: 'Padel Arena Dubai',
        start_time: '08:00',
        end_time: '09:00',
        date: today,
    },
    {
        id: 'b2',
        time_slot_id: `ts-c1-${today}-11`,
        player_id: 'p2',
        player: mockPlayers[1],
        status: 'checked_in',
        court_fee: 150,
        booking_fee: 15,
        gst: 8.25,
        total: 173.25,
        amount_paid: 173.25,
        payment_method: 'apple_pay',
        court_name: 'Court 1',
        facility_name: 'Padel Arena Dubai',
        start_time: '11:00',
        end_time: '12:00',
        date: today,
    },
    {
        id: 'b3',
        time_slot_id: `ts-c4-${today}-14`,
        player_id: 'p1',
        player: mockPlayers[0],
        status: 'completed',
        court_fee: 120,
        booking_fee: 12,
        gst: 6.6,
        total: 138.6,
        amount_paid: 138.6,
        payment_method: 'cash',
        court_name: 'Court A',
        facility_name: 'SportCity Courts',
        start_time: '14:00',
        end_time: '15:00',
        date: '2026-02-08',
    },
    {
        id: 'b4',
        time_slot_id: `ts-c4-${today}-8`,
        player_id: 'p1',
        player: mockPlayers[0],
        status: 'confirmed',
        court_fee: 120,
        booking_fee: 12,
        gst: 6.6,
        total: 138.6,
        amount_paid: 138.6,
        payment_method: 'bank_transfer',
        court_name: 'Court B',
        facility_name: 'SportCity Courts',
        start_time: '08:00',
        end_time: '09:00',
        date: today,
    },
    {
        id: 'b5',
        time_slot_id: `ts-c2-${today}-11`,
        player_id: 'p1',
        player: mockPlayers[0],
        status: 'completed',
        court_fee: 150,
        booking_fee: 15,
        gst: 8.25,
        total: 173.25,
        amount_paid: 173.25,
        payment_method: 'card_online',
        court_name: 'Court 2',
        facility_name: 'Padel Arena Dubai',
        start_time: '11:00',
        end_time: '12:00',
        date: '2026-02-05',
    },
    {
        id: 'b6',
        time_slot_id: `ts-c3-${today}-8`,
        player_id: 'p1',
        player: mockPlayers[0],
        status: 'cancelled',
        court_fee: 200,
        booking_fee: 20,
        gst: 11,
        total: 231,
        amount_paid: 0,
        payment_method: 'card_online',
        court_name: 'Court 3',
        facility_name: 'Padel Arena Dubai',
        start_time: '08:00',
        end_time: '09:00',
        date: '2026-01-28',
    },
];

export const statusColors: Record<string, string> = {
    confirmed: 'bg-primary/10 text-primary',
    checked_in: 'bg-success/10 text-success',
    completed: 'bg-muted text-muted-foreground',
    cancelled: 'bg-destructive/10 text-destructive',
    cancelled_via_otc: 'bg-destructive/10 text-destructive',
};

export const DEMO_PURCHASED_PACKAGES: PurchasedPackage[] = [
    {
        id: 'pp1',
        package_name: 'Advanced Pack',
        venue_name: 'Marina Racquet Club',
        cash_amount: 5000,
        credit_value: 7000,
        tier_grant: 'elite',
        purchased_at: '2026-02-20T14:30:00Z',
    },
    {
        id: 'pp2',
        package_name: 'Intermediate Pack',
        venue_name: 'Green Valley Padel',
        cash_amount: 2500,
        credit_value: 3200,
        tier_grant: 'pro',
        purchased_at: '2026-02-10T09:15:00Z',
    },
    {
        id: 'pp3',
        package_name: 'Starter Pack',
        venue_name: 'SportCity Courts',
        cash_amount: 1000,
        credit_value: 1200,
        tier_grant: null,
        purchased_at: '2026-01-15T18:45:00Z',
    },
    {
        id: 'pp4',
        package_name: 'Intermediate Pack',
        venue_name: 'Padel Arena Dubai',
        cash_amount: 2500,
        credit_value: 3200,
        tier_grant: 'pro',
        purchased_at: '2025-12-28T11:00:00Z',
    },
];

export const TIER_LABELS: Record<string, string> = {
    club: 'Club',
    pro: 'Pro',
    elite: 'Elite',
};

export const TIER_COLORS: Record<string, string> = {
    club: 'bg-muted text-muted-foreground',
    pro: 'bg-blue-500/10 text-blue-600',
    elite: 'bg-lime-500/10 text-lime-700',
};

export const mockCourts = [
    {
        id: 'c1',
        facility_id: '1',
        name: 'Padel Court 1',
        sport: 'Padel',
        capacity: 4,
        price_per_hour: 150,
        field_size: '20m x 10m',
    },
    {
        id: 'c2',
        facility_id: '1',
        name: 'Padel Court 2',
        sport: 'Padel',
        capacity: 4,
        price_per_hour: 150,
        field_size: '20m x 10m',
    },
    {
        id: 'c7',
        facility_id: '1',
        name: 'Padel Court 3',
        sport: 'Padel',
        capacity: 4,
        price_per_hour: 150,
        field_size: '20m x 10m',
    },
    {
        id: 'c8',
        facility_id: '1',
        name: 'Padel Court 4',
        sport: 'Padel',
        capacity: 4,
        price_per_hour: 150,
        field_size: '20m x 10m',
    },
    {
        id: 'c3',
        facility_id: '1',
        name: 'Pickleball Court 1',
        sport: 'Pickleball',
        capacity: 4,
        price_per_hour: 200,
        field_size: '20m x 10m',
    },
    {
        id: 'c9',
        facility_id: '1',
        name: 'Pickleball Court 2',
        sport: 'Pickleball',
        capacity: 4,
        price_per_hour: 200,
        field_size: '20m x 10m',
    },
    {
        id: 'c10',
        facility_id: '1',
        name: 'Pickleball Court 3',
        sport: 'Pickleball',
        capacity: 4,
        price_per_hour: 200,
        field_size: '20m x 10m',
    },
    {
        id: 'c11',
        facility_id: '1',
        name: 'Pickleball Court 4',
        sport: 'Pickleball',
        capacity: 4,
        price_per_hour: 200,
        field_size: '20m x 10m',
    },
    {
        id: 'c12',
        facility_id: '1',
        name: 'Pickleball Court 5',
        sport: 'Pickleball',
        capacity: 4,
        price_per_hour: 200,
        field_size: '20m x 10m',
    },
    {
        id: 'c13',
        facility_id: '1',
        name: 'Pickleball Court 6',
        sport: 'Pickleball',
        capacity: 4,
        price_per_hour: 200,
        field_size: '20m x 10m',
    },
    {
        id: 'c14',
        facility_id: '1',
        name: 'Pickleball Court 7',
        sport: 'Pickleball',
        capacity: 4,
        price_per_hour: 200,
        field_size: '20m x 10m',
    },
    {
        id: 'c15',
        facility_id: '1',
        name: 'Pickleball Court 8',
        sport: 'Pickleball',
        capacity: 4,
        price_per_hour: 200,
        field_size: '20m x 10m',
    },
    {
        id: 'c16',
        facility_id: '1',
        name: 'Pickleball Court 9',
        sport: 'Pickleball',
        capacity: 4,
        price_per_hour: 200,
        field_size: '20m x 10m',
    },
    {
        id: 'c4',
        facility_id: '2',
        name: 'Padel Court A',
        sport: 'Padel',
        capacity: 4,
        price_per_hour: 120,
        field_size: '20m x 10m',
    },
    {
        id: 'c5',
        facility_id: '2',
        name: 'Pickleball Court B',
        sport: 'Pickleball',
        capacity: 4,
        price_per_hour: 120,
        field_size: '20m x 10m',
    },
    {
        id: 'c17',
        facility_id: '3',
        name: 'Padel Court 1',
        sport: 'Padel',
        capacity: 4,
        price_per_hour: 100,
        field_size: '20m x 10m',
    },
    {
        id: 'c18',
        facility_id: '3',
        name: 'Padel Court 2',
        sport: 'Padel',
        capacity: 4,
        price_per_hour: 100,
        field_size: '20m x 10m',
    },
    {
        id: 'c19',
        facility_id: '4',
        name: 'Padel Court 1',
        sport: 'Padel',
        capacity: 4,
        price_per_hour: 180,
        field_size: '20m x 10m',
    },
    {
        id: 'c20',
        facility_id: '4',
        name: 'Padel Court 2',
        sport: 'Padel',
        capacity: 4,
        price_per_hour: 180,
        field_size: '20m x 10m',
    },
    {
        id: 'c21',
        facility_id: '4',
        name: 'Pickleball Court 1',
        sport: 'Pickleball',
        capacity: 4,
        price_per_hour: 160,
        field_size: '20m x 10m',
    },
    {
        id: 'c22',
        facility_id: '4',
        name: 'Pickleball Court 2',
        sport: 'Pickleball',
        capacity: 4,
        price_per_hour: 160,
        field_size: '20m x 10m',
    },
];

export const mockVenueInfo: Record<
    string,
    {
        hours: { day: string; time: string }[];
        googleMapsUrl: string;
        cancellationPolicy: string;
        reschedulingPolicy: string;
    }
> = {
    '1': {
        hours: [
            { day: 'Mon – Fri', time: '7:00 AM – 11:00 PM' },
            { day: 'Sat – Sun', time: '6:00 AM – 11:00 PM' },
        ],
        googleMapsUrl: 'https://maps.google.com/?q=Al+Quoz+Dubai',
        cancellationPolicy:
            'Free cancellation up to 24 hours before your session. Cancellations within 24 hours are non-refundable.',
        reschedulingPolicy:
            'Reschedule up to 12 hours in advance at no charge. One reschedule allowed per booking.',
    },
    '2': {
        hours: [
            { day: 'Mon – Fri', time: '8:00 AM – 10:00 PM' },
            { day: 'Sat – Sun', time: '7:00 AM – 10:00 PM' },
        ],
        googleMapsUrl: 'https://maps.google.com/?q=Downtown+Dubai',
        cancellationPolicy:
            'Free cancellation up to 48 hours before your session. No refunds for later cancellations.',
        reschedulingPolicy:
            'Reschedule up to 24 hours in advance. One free reschedule per booking.',
    },
    '3': {
        hours: [{ day: 'Daily', time: '7:00 AM – 10:00 PM' }],
        googleMapsUrl: 'https://maps.google.com/?q=JLT+Dubai',
        cancellationPolicy:
            'Free cancellation up to 24 hours before your session.',
        reschedulingPolicy:
            'Reschedule up to 12 hours in advance at no charge.',
    },
    '4': {
        hours: [
            { day: 'Mon – Fri', time: '6:00 AM – 11:00 PM' },
            { day: 'Sat – Sun', time: '6:00 AM – 11:00 PM' },
        ],
        googleMapsUrl: 'https://maps.google.com/?q=Dubai+Marina',
        cancellationPolicy:
            'Free cancellation up to 24 hours before your session.',
        reschedulingPolicy:
            'Reschedule up to 12 hours in advance at no charge.',
    },
};

export const sportEmojis: Record<string, string> = {
    Padel: '🎾',
    Pickleball: '🏓',
};

export function generateTimeSlots(courtId: string, date: string) {
    const hours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
    return hours.map((h, i) => ({
        id: `ts-${courtId}-${date}-${h}`,
        court_id: courtId,
        date,
        start_time: `${h.toString().padStart(2, '0')}:00`,
        end_time: `${(h + 1).toString().padStart(2, '0')}:00`,
        status: (i % 3 === 1
            ? 'booked'
            : i % 5 === 0
              ? 'blocked'
              : 'available') as 'available' | 'booked' | 'blocked',
    }));
}
