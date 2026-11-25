/** Load state shared by the league screens (set by the page that fetches the view). */
const subs = new Set<() => void>();
export const leagueStatus = {
    error: null as string | null,
    version: 0,
    refetch: null as null | (() => Promise<unknown>),
    set(patch: { error?: string | null; refetch?: () => Promise<unknown> }) {
        if (patch.error !== undefined) this.error = patch.error;
        if (patch.refetch) this.refetch = patch.refetch;
        this.version++;
        for (const f of subs) f();
    },
    subscribe(f: () => void) {
        subs.add(f);
        return () => {
            subs.delete(f);
        };
    },
};
