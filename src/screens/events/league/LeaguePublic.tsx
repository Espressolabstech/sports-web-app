import { useParams } from 'react-router-dom';
import { useEventLive, useEventPush } from '../../../lib/auction-live';
import { leagueRequest } from '../../../lib/league-api';
import { useLeagueSync } from '@league/lib/use-league-sync';
import { setLeagueLinks } from '@league/lib/links';
import type { LeagueView } from '@league/lib/server-types';
import { Results } from '@league/pages/Results';
import '../registration-identical.css';
import AuctionShell from '../auction/AuctionShell';
import '../../../components/pp-ui';
import '@league/league.scoped.css';

/** Court Collective league — public view (the reference's /results): fixtures & scores, tables, squads, locked line-ups. */
export default function LeaguePublic({ slugOverride }: { slugOverride?: string }) {
    const params = useParams();
    const slug = slugOverride ?? params.slug ?? '';
    setLeagueLinks({ '/team': slugOverride ? '/league/team' : `/events/${slug}/league/team`, '/results': slugOverride ? '/league' : `/events/${slug}/league` }, false, ({ title, actions, children }) => (
        <AuctionShell slug={slug} title={title} right={actions} nav={false} footer="Padel Master, SBR">
            {children}
        </AuctionShell>
    ));
    useLeagueSync({
        key: ['league', 'public', slug],
        slug,
        mode: 'public',
        fetchView: () => leagueRequest<LeagueView>(slug, 'GET', `/public/events/${slug}/league`),
        request: () => Promise.reject(new Error('Read only')),
        useLive: useEventLive,
        usePush: useEventPush,
    });
    return (
        <>
            <Results />
        </>
    );
}
