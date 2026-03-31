import { endpoints } from '../../config/apiEndpoints';
import apiClient from '../client/apiClient';

export const getUpcomingBookings = async (params?: {
    page?: number;
    limit?: number;
}): Promise<ApiResponse<ApiBookingListData>> => {
    return apiClient({
        url: endpoints.upcomingBookings,
        method: 'GET',
        params,
    });
};

export const getPastBookings = async (params?: {
    page?: number;
    limit?: number;
}): Promise<ApiResponse<ApiBookingListData>> => {
    return apiClient({
        url: endpoints.pastBookings,
        method: 'GET',
        params,
    });
};
