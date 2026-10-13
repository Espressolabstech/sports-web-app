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

export const getRegistrationPhotoUploadUrl = async (
    slug: string,
    mimetype: string,
): Promise<ApiResponse<RegistrationPhotoUploadUrlData>> => {
    return apiClient({
        url: endpoints.registrationPhotoUploadUrl(slug),
        method: 'POST',
        data: { mimetype },
    });
};

/** Temporary manual-payment path (shared UPI QR, no Razorpay) — presigned URL for the payment screenshot. */
export const getPaymentProofUploadUrl = async (
    slug: string,
    mimetype: string,
): Promise<ApiResponse<RegistrationPhotoUploadUrlData>> => {
    return apiClient({
        url: endpoints.paymentProofUploadUrl(slug),
        method: 'POST',
        data: { mimetype },
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

/** Read-only player list + metrics for a detailed-registration event — no login. */
/**
 * `token` is the event-scoped host-viewer login (see hostPreviewLogin
 * below), never the app's own player/organizer session token — passed
 * explicitly as a header so it overrides whatever the shared apiClient
 * would otherwise attach for this device.
 */
export const getHostPreview = async (
    slug: string,
    token: string,
): Promise<ApiResponse<ApiHostPreviewData>> => {
    return apiClient({
        url: endpoints.hostPreview(slug),
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
    });
};

export const hostPreviewLogin = async (slug: string, phone: string): Promise<ApiResponse<null>> => {
    return apiClient({ url: endpoints.hostPreviewLogin(slug), method: 'POST', data: { phone } });
};
