import axios from 'axios';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import config from '../../config/config';
import { getToken, removeToken } from '../../utils/cookies.helpers';

const apiClient = async <T = unknown>(
    options: AxiosRequestConfig,
): Promise<T> => {
    const baseURL = config.apiUrl;

    const client = axios.create({ baseURL });

    const token = getToken();

    if (token) client.defaults.headers.common.Authorization = `Bearer ${token}`;

    try {
        const response: AxiosResponse<T> = await client(options);

        if (!response.data) throw new Error('API Request Was Not Successful');

        return response.data;
    } catch (error: unknown) {
        // Only redirect to login on 401 if the request had a token
        // (i.e., the user's session expired). Guest browsing should NOT redirect.
        if (
            axios.isAxiosError(error) &&
            error.response?.status === 401 &&
            token
        ) {
            removeToken();
            const apiMessage: string | undefined =
                error.response?.data?.message;
            const isBanned = apiMessage?.toLowerCase().includes('banned');
            const redirectUrl = isBanned ? '/?reason=banned' : '/';
            window.location.href = redirectUrl;
        }

        if (axios.isAxiosError(error) && error.response?.status === 403) {
            // window.location.href = '/login';
        }

        if (error instanceof Error && error.message === 'Network Error') {
            window.location.href = '/500';
        }

        const errorObj: ApiError = {
            status: axios.isAxiosError(error)
                ? error.response?.status
                : undefined,
            message: axios.isAxiosError(error)
                ? error.response?.data?.message || error.message
                : (error as Error).message,
        };

        throw errorObj;
    }
};

export default apiClient;
