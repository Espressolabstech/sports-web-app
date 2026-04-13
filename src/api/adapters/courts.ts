import { endpoints } from '../../config/apiEndpoints';
import apiClient from '../client/apiClient';

export const getCourtDetail = async (
    courtId: string,
    date?: string,
): Promise<ApiResponse<ApiCourtDetail>> => {
    return apiClient({
        url: endpoints.courtDetail(courtId),
        method: 'GET',
        params: date ? { date } : undefined,
    });
};

export const getCourtShareText = async (
    courtId: string,
    date: string,
): Promise<ApiResponse<{ messageText: string; date: string; isToday: boolean; slotsCount: number }>> => {
    return apiClient({
        url: endpoints.courtShare(courtId),
        method: 'POST',
        data: { date },
    });
};
