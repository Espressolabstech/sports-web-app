import { endpoints } from '../../config/apiEndpoints';
import apiClient from '../client/apiClient';

export const getPointsWallet = async (
    venueId: string,
): Promise<ApiResponse<{ wallet: ApiPointsWallet | null }>> =>
    apiClient({ url: endpoints.pointsWallet(venueId), method: 'GET' });

export const getMyClubs = async (): Promise<ApiResponse<{ clubs: ApiMyClub[] }>> =>
    apiClient({ url: endpoints.myClubs, method: 'GET' });

export const buyPoints = async (data: {
    venueId: string;
    points: number;
}): Promise<ApiResponse<BuyPointsOrderResponse>> =>
    apiClient({ url: endpoints.buyPoints, method: 'POST', data });

export const verifyBuyPoints = async (
    data: BuyPointsVerifyBody,
): Promise<ApiResponse<{ wallet: { balance: number }; pointsAdded: number }>> =>
    apiClient({ url: endpoints.verifyBuyPoints, method: 'POST', data });
