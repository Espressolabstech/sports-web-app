/**
 * Loads one league view and keeps it live with no delay:
 *  - 'league:score' (one match) and 'league:public' (the full public view) are pushed by the server the moment
 *    something changes, and applied straight into the cache — no request;
 *  - the 'event:changed' signal that follows refetches this viewer's private parts (line-ups, mobiles) in the background.
 * Connects the reference store adapter to this app's API.
 */
import { useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { configureLeague, setLeagueView } from '@league/lib/league-store';
import { leagueStatus } from '@league/lib/league-status';
import { setLeagueRequest } from '@league/lib/request';
import { applyScorePatch, mergePublic } from '@league/lib/live-merge';
import { setLeaguePatcher } from '@league/lib/patch';
import type { LeagueView } from '@league/lib/server-types';

type Request = (method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown) => Promise<unknown>;
type Push = { slug?: string; at?: number; view?: LeagueView; tie?: number; match?: Parameters<typeof applyScorePatch>[2] };

export function useLeagueSync(opts: {
    key: unknown[];
    slug: string;
    mode: 'host' | 'team' | 'public';
    fetchView: () => Promise<LeagueView>;
    request: Request;
    useLive: (slug: string | null, onChange: () => void) => void;
    /** Subscribes to a pushed socket event for this event's room. */
    usePush: (slug: string | null, event: string, onPush: (msg: Push) => void) => void;
    signOut?: () => void;
    enabled?: boolean;
}) {
    const qc = useQueryClient();
    const keyStr = JSON.stringify(opts.key);
    const q = useQuery({ queryKey: opts.key, queryFn: opts.fetchView, enabled: opts.enabled ?? true, retry: 1, refetchOnWindowFocus: true });
    const refetch = () => qc.invalidateQueries({ queryKey: opts.key });
    const request: Request = (m, p, b) => opts.request(m, p.replace(':slug', encodeURIComponent(opts.slug)), b);
    setLeagueRequest(request);
    const applyView = (v: LeagueView) => {
        void qc.cancelQueries({ queryKey: opts.key });
        qc.setQueryData<LeagueView>(opts.key, v);
    };
    configureLeague({ mode: opts.mode, request, refetch, applyView, signOut: opts.signOut });

    /** Applies a change to the cached view at once; an older in-flight fetch can't overwrite it. */
    const patch = useCallback(
        (fn: (v: LeagueView) => LeagueView) => {
            const key = JSON.parse(keyStr) as unknown[];
            void qc.cancelQueries({ queryKey: key });
            qc.setQueryData<LeagueView>(key, (v) => (v ? fn(v) : v));
        },
        [qc, keyStr],
    );
    useEffect(() => setLeaguePatcher(patch), [patch]);

    useEffect(() => {
        setLeagueView(q.data ?? null);
    }, [q.data]);
    useEffect(() => {
        leagueStatus.set({ error: q.error ? 'Could not load scores. Refresh to try again.' : null, refetch });
    }, [q.error]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => () => setLeagueView(null), []);

    const latest = useRef(refetch);
    useEffect(() => {
        latest.current = refetch;
    });
    const live = opts.enabled === false ? null : opts.slug;
    // Pushes are ordered by `at`: an older one never overwrites a newer one.
    const lastAt = useRef(0);
    const onScore = useCallback(
        (msg: Push) => {
            if (!msg.tie || !msg.match || (msg.at ?? 0) < lastAt.current) return;
            lastAt.current = msg.at ?? 0;
            patch((v) => applyScorePatch(v, msg.tie!, msg.match!));
        },
        [patch],
    );
    const onPublic = useCallback(
        (msg: Push) => {
            if (!msg.view || (msg.at ?? 0) < lastAt.current) return;
            lastAt.current = msg.at ?? 0;
            patch((v) => mergePublic(v, msg.view!));
        },
        [patch],
    );
    const onChange = useCallback(() => {
        // Public screens have everything from the push already; the others refetch their private parts.
        if (opts.mode !== 'public') void latest.current();
    }, [opts.mode]);
    opts.usePush(live, 'league:score', onScore);
    opts.usePush(live, 'league:public', onPublic);
    opts.useLive(live, onChange);
    return q;
}
