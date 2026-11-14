import { endpoints } from '../../config/apiEndpoints';
import apiClient from '../client/apiClient';
import type { TeamEvent } from '../../lib/team/teamEvent';

export interface TeamRegistrationBody {
    cohort?: string;
    name?: string;
    players: { name: string; phone: string }[];
}

export interface TeamRegistrationReply {
    /** True when an entry fee must be paid before the team exists. */
    pending: boolean;
    teamId: string | null;
    reference: string | null;
    razorpay: { orderId: string; amount: number; currency: string; keyId: string } | null;
}

export const getPublicTeamEvent = async (slug: string): Promise<ApiResponse<{ event: TeamEvent }>> =>
    apiClient({ url: endpoints.teamEvent(slug), method: 'GET' });

export const registerTeam = async (slug: string, data: TeamRegistrationBody): Promise<ApiResponse<TeamRegistrationReply>> =>
    apiClient({ url: endpoints.teamRegister(slug), method: 'POST', data });

export const confirmTeamPayment = async (
    slug: string,
    data: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string },
): Promise<ApiResponse<{ teamId: string; reference: string }>> =>
    apiClient({ url: endpoints.teamConfirmPayment(slug), method: 'POST', data });
