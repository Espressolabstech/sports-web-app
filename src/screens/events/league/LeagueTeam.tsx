import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useEventLive, useEventPush } from '../../../lib/auction-live';
import { leagueRequest, leagueTeamToken, setLeagueTeamToken } from '../../../lib/league-api';
import { useLeagueSync } from '@league/lib/use-league-sync';
import { setLeagueLinks } from '@league/lib/links';
import type { LeagueView } from '@league/lib/server-types';
import { TeamPage } from '@league/pages/Team';
import '../registration-identical.css';
import AuctionShell from '../auction/AuctionShell';
import '../../../components/pp-ui';
import '@league/league.scoped.css';

/**
 * Court Collective league — the team's screen (the Lovable reference's /team): OTP sign-in with the mobile the
 * organisers set for the team, then Fixtures (line-up builder) · Squad · Scores. Secrecy is enforced by the server.
 */
export default function LeagueTeam({ slugOverride }: { slugOverride?: string }) {
    const params = useParams();
    const slug = slugOverride ?? params.slug ?? '';
    const qc = useQueryClient();
    const signedIn = !!leagueTeamToken(slug);
    setLeagueLinks({ '/team': slugOverride ? '/league/team' : `/events/${slug}/league/team`, '/results': slugOverride ? '/league' : `/events/${slug}/league` }, false, ({ title, actions, children }) => (
        <AuctionShell slug={slug} title={title} right={actions} nav={false}>
            {children}
        </AuctionShell>
    ));
    useLeagueSync({
        key: ['league', 'team', slug, signedIn],
        slug,
        mode: 'team',
        enabled: signedIn,
        fetchView: () => leagueRequest<LeagueView>(slug, 'GET', `/public/events/${slug}/league/team`),
        request: (method, path, body) => leagueRequest(slug, method, path, body),
        useLive: useEventLive,
        usePush: useEventPush,
        signOut: () => {
            setLeagueTeamToken(slug, null);
            void qc.invalidateQueries({ queryKey: ['league', 'team', slug] });
            window.location.reload();
        },
    });
    const message = (e: unknown) => (e as { message?: string }).message || 'Something went wrong. Try again.';
    return (
        <>
            <TeamPage
                signIn={{
                    send: async (mobile) => {
                        try {
                            await leagueRequest(slug, 'POST', `/public/events/${slug}/league/team-login`, { phone: mobile });
                            return null;
                        } catch (e) {
                            return message(e);
                        }
                    },
                    verify: async (mobile, otp) => {
                        try {
                            const out = await leagueRequest<{ token: string }>(slug, 'POST', `/public/events/${slug}/league/team-verify`, { phone: mobile, otp });
                            setLeagueTeamToken(slug, out.token);
                            window.location.reload();
                            return null;
                        } catch (e) {
                            return message(e);
                        }
                    },
                }}
            />
        </>
    );
}
