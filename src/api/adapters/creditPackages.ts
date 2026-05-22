import { endpoints } from '../../config/apiEndpoints';
import apiClient from '../client/apiClient';

export const getCreditPackages = async (): Promise<
    ApiResponse<CreditPackage[]>
> => {
    return apiClient({ url: endpoints.creditPackages, method: 'GET' });
};

export const purchaseCreditPackage = async (
    id: string,
    data?: PurchaseCreditPackageBody,
): Promise<ApiResponse<ApiRazorpayOrder>> => {
    return apiClient({
        url: endpoints.purchaseCreditPackage(id),
        method: 'POST',
        data,
    });
};

export const verifyCreditPayment = async (
    data: VerifyCreditPaymentBody,
): Promise<ApiResponse<{ credits_added: number; new_balance: number }>> => {
    return apiClient({
        url: endpoints.verifyCreditPayment,
        method: 'POST',
        data,
    });
};
