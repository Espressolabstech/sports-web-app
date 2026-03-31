import { endpoints } from '../../config/apiEndpoints';
import apiClient from '../client/apiClient';

export const getTierBenefits = async (): Promise<
    ApiResponse<ApiTierBenefits>
> => {
    return apiClient({ url: endpoints.tierBenefits, method: 'GET' });
};

export const getVenueTier = async (
    venueId: string,
): Promise<ApiResponse<ApiVenueTier>> => {
    return apiClient({ url: endpoints.tierByVenue(venueId), method: 'GET' });
};
