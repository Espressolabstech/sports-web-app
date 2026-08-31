import { endpoints } from '../../config/apiEndpoints';
import apiClient from '../client/apiClient';

export const getEvents = async (): Promise<ApiResponse<ApiEventListData>> => {
    return apiClient({ url: endpoints.events, method: 'GET' });
};

export const getEventDetail = async (
    slug: string,
): Promise<ApiResponse<ApiEventDetailData>> => {
    return apiClient({ url: endpoints.eventDetail(slug), method: 'GET' });
};

export const registerForEvent = async (
    slug: string,
    data: RegisterForEventBody,
): Promise<ApiResponse<ApiEventRegistrationData>> => {
    return apiClient({
        url: endpoints.registerForEvent(slug),
        method: 'POST',
        data,
    });
};

export const verifyEventPayment = async (
    slug: string,
    entrantId: string,
    data: VerifyEventPaymentBody,
): Promise<ApiResponse<ApiEventRegistrationData>> => {
    return apiClient({
        url: endpoints.verifyEventPayment(slug, entrantId),
        method: 'POST',
        data,
    });
};
