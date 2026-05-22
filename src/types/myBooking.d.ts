declare global {
    interface MockBooking {
        id: string;
        time_slot_id: string;
        player_id: string;
        player: (typeof mockPlayers)[number];
        status: 'confirmed' | 'checked_in' | 'completed' | 'cancelled';
        court_fee: number;
        booking_fee: number;
        gst: number;
        total: number;
        amount_paid: number;
        payment_method: PaymentMethod;
        court_name: string;
        facility_name: string;
        start_time: string;
        end_time: string;
        date: string;
    }
}

export {};
