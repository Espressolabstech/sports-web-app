import { isBefore, parse } from 'date-fns';

export function isUpcoming(b: MockBooking) {
    const bookingDateTime = parse(
        `${b.date} ${b.end_time}`,
        'yyyy-MM-dd HH:mm',
        new Date(),
    );
    return (
        !isBefore(bookingDateTime, new Date()) &&
        b.status !== 'cancelled' &&
        b.status !== 'completed'
    );
}
