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
        if (axios.isAxiosError(error) && error.response?.status === 401) {
            removeToken();
            window.location.href = '/login';
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
