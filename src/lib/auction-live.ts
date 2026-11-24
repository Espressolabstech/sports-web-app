import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import config from '../config/config';

let socket: Socket | null = null;

/** One shared connection to the API's socket server (same host as the REST API). */
function getSocket(): Socket {
    if (!socket) socket = io(new URL(config.apiUrl).origin, { transports: ['websocket'] });
    return socket;
}

/**
 * Calls `onChange` whenever this event changes on the server — including
 * every auction action (sold, retained, category started, ...), since the
 * backend broadcasts the same generic `event:changed` signal for those.
 * Signal-only: no payload, callers just refetch. Pass null to stop.
 */
export function useEventLive(slug: string | null, onChange: () => void) {
    useEffect(() => {
        if (!slug) return;
        const s = getSocket();
        const watch = () => s.emit('event:watch', slug);
        const handler = (msg: { slug?: string }) => {
            if (msg?.slug === slug) onChange();
        };
        watch();
        // rejoin the room after a dropped connection comes back
        s.on('connect', watch);
        s.on('event:changed', handler);
        return () => {
            s.emit('event:unwatch', slug);
            s.off('connect', watch);
            s.off('event:changed', handler);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug]);
}

/**
 * The public live auction screen. The server pushes the whole new live board over the socket the moment
 * something changes, so the screen updates without a request. `at` orders pushes; an older one never
 * overwrites a newer one. `onResync` fires after a dropped connection comes back (changes may have been missed).
 */
export function useAuctionLivePush(slug: string | null, onBoard: (board: unknown) => void, onResync: () => void) {
    useEffect(() => {
        if (!slug) return;
        const s = getSocket();
        let latest = 0;
        let connectedBefore = s.connected;
        const watch = () => {
            s.emit('event:watch', slug);
            if (connectedBefore) onResync();
            connectedBefore = true;
        };
        const handler = (msg: { slug?: string; at?: number; board?: unknown }) => {
            if (msg?.slug !== slug || !msg.board || typeof msg.at !== 'number' || msg.at < latest) return;
            latest = msg.at;
            onBoard(msg.board);
        };
        s.emit('event:watch', slug);
        s.on('connect', watch);
        s.on('auction:live', handler);
        return () => {
            s.emit('event:unwatch', slug);
            s.off('connect', watch);
            s.off('auction:live', handler);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug]);
}

/**
 * A pushed socket event for this event's room (e.g. the league's 'league:score' / 'league:public'): the data comes
 * with the message, so the screen updates without a request. Pass null to stop.
 */
export function useEventPush<T>(slug: string | null, event: string, onPush: (msg: T) => void) {
    useEffect(() => {
        if (!slug) return;
        const s = getSocket();
        const watch = () => s.emit('event:watch', slug);
        const handler = (msg: T & { slug?: string }) => {
            if (msg?.slug === slug) onPush(msg);
        };
        watch();
        s.on('connect', watch);
        s.on(event, handler);
        return () => {
            s.off('connect', watch);
            s.off(event, handler);
        };
    }, [slug, event, onPush]);
}

/**
 * Team hub / Squads: the server pushes the code-gated public view (to sockets that joined with the right code) and the
 * live board the moment anything changes, so these pages update without a request. `at` orders pushes.
 */
export function useAuctionPublicPush(
    slug: string | null,
    code: string | null,
    onView: (view: ApiAuctionPublicView) => void,
    onLive: (live: ApiAuctionLiveData) => void,
) {
    useEffect(() => {
        if (!slug || !code) return;
        const s = getSocket();
        let viewAt = 0;
        let liveAt = 0;
        const watch = () => {
            s.emit('event:watch', slug);
            s.emit('auction:watch-public', { slug, code });
        };
        const onPublic = (msg: { slug?: string; at?: number; view?: ApiAuctionPublicView }) => {
            if (msg?.slug !== slug || !msg.view || typeof msg.at !== 'number' || msg.at < viewAt) return;
            viewAt = msg.at;
            onView(msg.view);
        };
        const onBoard = (msg: { slug?: string; at?: number; board?: ApiAuctionLiveData }) => {
            if (msg?.slug !== slug || !msg.board || typeof msg.at !== 'number' || msg.at < liveAt) return;
            liveAt = msg.at;
            onLive(msg.board);
        };
        watch();
        s.on('connect', watch);
        s.on('auction:public', onPublic);
        s.on('auction:live', onBoard);
        return () => {
            s.off('connect', watch);
            s.off('auction:public', onPublic);
            s.off('auction:live', onBoard);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug, code]);
}
