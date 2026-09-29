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

export const getEventStandings = async (
    slug: string,
): Promise<ApiResponse<ApiEventStandingsData>> => {
    return apiClient({ url: endpoints.eventStandings(slug), method: 'GET' });
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

export const confirmEventPayment = async (
    slug: string,
    data: ConfirmEventPaymentBody,
): Promise<ApiResponse<ApiEventPaymentConfirmationData>> => {
    return apiClient({
        url: endpoints.confirmEventPayment(slug),
        method: 'POST',
        data,
    });
};

/** Looks up whether a phone number is already registered for this event — 404s if not. */
export const getEventRegistrationByPhone = async (
    slug: string,
    phone: string,
): Promise<ApiResponse<ApiEventRegistrationLookupData>> => {
    return apiClient({
        url: endpoints.eventRegistrationLookup(slug),
        method: 'GET',
        params: { phone },
    });
};
