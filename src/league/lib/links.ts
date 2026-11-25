/** Where the reference routes live in this app (set once by the page). */
export const leagueLinks = {
    map: {} as Record<string, string>,
    /** Testing presets in the shell (staging only — the server refuses them in production too). */
    testing: false,
    /** The app's own page frame (brand header, app tabs, title). Without one, the reference's standalone shell is used. */
    /** Shareable player-app links for teams and the public (organiser menu). */
    share: { team: '', public: '' },
    /** The league screens render the reference's heading in their own column (the frame shows none). */
    ownHeading: false,
    frame: null as null | ((p: { title: string; actions?: import('react').ReactNode; children: import('react').ReactNode }) => import('react').ReactNode),
    resolve(to: string) {
        return this.map[to] ?? to;
    },
};

/** Called by the page: where the reference routes live in this app, and whether testing presets show. */
export function setLeagueLinks(map: Record<string, string>, testing: boolean, frame: typeof leagueLinks.frame = null, ownHeading = false) {
    leagueLinks.map = map;
    leagueLinks.testing = testing;
    leagueLinks.frame = frame;
    leagueLinks.ownHeading = ownHeading;
}

/** The player-app links teams and the public open (shown in the organiser menu to open or copy). */
export function setShareLinks(team: string, publicPage: string) {
    leagueLinks.share = { team, public: publicPage };
}
