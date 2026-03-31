import { endpoints } from '../../config/apiEndpoints';
import apiClient from '../client/apiClient';

export const getWallet = async (): Promise<ApiResponse<ApiWallet>> => {
    return apiClient({ url: endpoints.wallet, method: 'GET' });
};

export const getWalletTransactions = async (
    params?: ApiWalletTransactionsParams,
): Promise<ApiResponse<ApiWalletTransaction[]>> => {
    return apiClient({ url: endpoints.walletTransactions, method: 'GET', params });
};
