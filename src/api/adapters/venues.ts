import { endpoints } from '../../config/apiEndpoints';
import apiClient from '../client/apiClient';

export const getVenues = async (
    params: ApiVenueListParams,
): Promise<ApiResponse<ApiVenueListData>> => {
    return apiClient({ url: endpoints.venues, method: 'GET', params });
};

export const getVenueDetail = async (
    venueId: string,
): Promise<ApiResponse<ApiVenueDetailResponse>> => {
    return apiClient({ url: endpoints.venueDetail(venueId), method: 'GET' });
};
