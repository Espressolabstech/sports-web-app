/** The app's API request, set by the page (host token in the organiser app, team token in the player app). */
type Request = (method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown) => Promise<unknown>;
let impl: Request | null = null;
export const setLeagueRequest = (r: Request) => {
    impl = r;
};
export const requestLeague: Request = (m, p, b) => {
    if (!impl) throw new Error('League is not connected');
    return impl(m, p, b);
};
