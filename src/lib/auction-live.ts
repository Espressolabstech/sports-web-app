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
