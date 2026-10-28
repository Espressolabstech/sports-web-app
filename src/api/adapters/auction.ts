import axios from 'axios';
import config from '../../config/config';
import { endpoints } from '../../config/apiEndpoints';
import apiClient from '../client/apiClient';

/** Public: the live screen. No purses, spend or squads. */
export const getAuctionLive = async (slug: string): Promise<ApiResponse<ApiAuctionLiveData>> => {
    return apiClient({ url: endpoints.auctionLive(slug), method: 'GET' });
};

/** Team users (added by the host in the organizer console) log in with
 *  phone + OTP; the token is scoped to their team's event. */
export const auctionTeamLogin = async (slug: string, phone: string): Promise<ApiResponse<null>> => {
    return apiClient({ url: endpoints.auctionTeamLogin(slug), method: 'POST', data: { phone } });
};

export const auctionTeamVerify = async (
    slug: string,
    phone: string,
    otp: string,
): Promise<ApiResponse<{ token: string; member: { id: string; name: string }; team: { id: string; name: string } }>> => {
    return apiClient({ url: endpoints.auctionTeamVerify(slug), method: 'POST', data: { phone, otp } });
};

/** Plain axios, not apiClient: a 401 here means the team login is gone, and
 *  must not log out (or redirect) a player session on the same browser. */
export const getAuctionTeamBoard = async (slug: string, token: string): Promise<ApiResponse<ApiAuctionBoardData>> => {
    try {
        const response = await axios.get(endpoints.auctionTeamBoard(slug), {
            baseURL: config.apiUrl,
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    } catch (error) {
        throw {
            status: axios.isAxiosError(error) ? error.response?.status : undefined,
            message: axios.isAxiosError(error) ? error.response?.data?.message || error.message : (error as Error).message,
        };
    }
};
