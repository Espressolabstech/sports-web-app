import { useCallback, useState } from 'react';

/** Team-user login for one event's auction team view, separate from the
 *  player session (and from any other event's team login). */
const keyFor = (slug: string) => `auction-team-session:${slug}`;

export interface AuctionTeamSession {
    token: string;
    memberName: string;
    teamId: string;
    teamName: string;
}

function read(slug: string): AuctionTeamSession | null {
    try {
        const raw = localStorage.getItem(keyFor(slug));
        return raw ? (JSON.parse(raw) as AuctionTeamSession) : null;
    } catch {
        return null;
    }
}

export function useAuctionTeamSession(slug: string) {
    const [session, setSession] = useState<AuctionTeamSession | null>(() => read(slug));
    const login = useCallback(
        (s: AuctionTeamSession) => {
            try {
                localStorage.setItem(keyFor(slug), JSON.stringify(s));
            } catch {
                /* storage unavailable: session lasts for this tab only */
            }
            setSession(s);
        },
        [slug],
    );
    const logout = useCallback(() => {
        try {
            localStorage.removeItem(keyFor(slug));
        } catch {
            /* ignore */
        }
        setSession(null);
    }, [slug]);
    return { session, login, logout };
}
