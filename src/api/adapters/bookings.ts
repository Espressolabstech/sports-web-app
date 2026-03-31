import { endpoints } from '../../config/apiEndpoints';
import apiClient from '../client/apiClient';

export const createBooking = async (
    data: CreateBookingBody,
): Promise<ApiResponse<ApiCreateBookingResponse>> => {
    return apiClient({ url: endpoints.createBooking, method: 'POST', data });
};

export const verifyBookingPayment = async (
    bookingId: string,
    data: VerifyBookingPaymentBody,
): Promise<ApiResponse<ApiBooking>> => {
    return apiClient({
        url: endpoints.verifyBookingPayment(bookingId),
        method: 'POST',
        data,
    });
};

export const cancelBooking = async (
    bookingId: string,
): Promise<ApiResponse<ApiBooking>> => {
    return apiClient({
        url: endpoints.cancelBooking(bookingId),
        method: 'PATCH',
    });
};

export const getMyBookings = async (): Promise<ApiResponse<ApiBooking[]>> => {
    return apiClient({ url: endpoints.myBookings, method: 'GET' });
};

export const getBookingDetail = async (
    bookingId: string,
): Promise<ApiResponse<ApiBooking>> => {
    return apiClient({ url: endpoints.bookingDetail(bookingId), method: 'GET' });
};
