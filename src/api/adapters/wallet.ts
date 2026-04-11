import { endpoints } from '../../config/apiEndpoints';
import apiClient from '../client/apiClient';

export const getWallet = async (venueId: string): Promise<ApiResponse<{ wallet: ApiWallet }>> => {
    return apiClient({ url: endpoints.venueWallet(venueId), method: 'GET' });
};

export const getWalletTransactions = async (
    params?: ApiWalletTransactionsParams,
): Promise<ApiResponse<ApiWalletTransaction[]>> => {
    return apiClient({ url: endpoints.walletTransactions, method: 'GET', params });
};
