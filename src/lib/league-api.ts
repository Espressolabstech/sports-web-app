import axios from 'axios';
import config from '../config/config';

/** League team login (OTP) — its own token per event, separate from the player's account login. */
const KEY = (slug: string) => `pp-league-team:${slug}`;
export const leagueTeamToken = (slug: string) => {
    try {
        return localStorage.getItem(KEY(slug));
    } catch {
        return null;
    }
};
export const setLeagueTeamToken = (slug: string, token: string | null) => {
    try {
        if (token) localStorage.setItem(KEY(slug), token);
        else localStorage.removeItem(KEY(slug));
    } catch {
        /* storage blocked: signed in for this page only */
    }
};

/** One request to sports-api for the league pages; errors come back as { status, message }. */
export async function leagueRequest<T = unknown>(slug: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, data?: unknown): Promise<T> {
    const token = leagueTeamToken(slug);
    try {
        const res = await axios({ baseURL: config.apiUrl, url, method, data, headers: token ? { Authorization: `Bearer ${token}` } : {} });
        return (res.data as { data: T }).data;
    } catch (error) {
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        if (status === 401 && token) {
            // Expired sign-in: clear it and reopen the page on the sign-in form (instead of a loader that never ends).
            setLeagueTeamToken(slug, null);
            window.location.replace(window.location.pathname);
        }
        throw { status, message: axios.isAxiosError(error) ? (error.response?.data as { message?: string })?.message || error.message : 'Something went wrong' };
    }
}
