import { endpoints } from '../../config/apiEndpoints';
import apiClient from '../client/apiClient';

export const userLogin = async (data: UserLogin) => {
    return apiClient({ url: endpoints.login, method: 'POST', data });
};

export const verifyOtp = async (data: VerifyOtp): Promise<AuthResponse> => {
    return apiClient({ url: endpoints.verifyOtp, method: 'POST', data });
};

export const resendOtp = async (data: ResendOtp) => {
    return apiClient({ url: endpoints.resendOtp, method: 'POST', data });
};
