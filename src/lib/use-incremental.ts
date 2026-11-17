import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Renders a long list a page at a time: the first `step` items, then the next page each time the sentinel scrolls
 * into view. The data is already loaded in one request, so this only limits how many tiles the browser draws (a few
 * hundred tiles at once is what makes phones lag). `resetKey` (the filters) starts again from the first page.
 */
export function useIncremental<T>(items: T[], resetKey: string, step = 60) {
    const [state, setState] = useState({ key: resetKey, count: step });
    // New filters: back to the first page (derived during render, no extra paint).
    if (state.key !== resetKey) setState({ key: resetKey, count: step });
    const count = state.key === resetKey ? state.count : step;
    const hasMore = items.length > count;

    const observer = useRef<IntersectionObserver | null>(null);
    const more = useCallback(() => setState((s) => ({ ...s, count: s.count + step })), [step]);
    const sentinel = useCallback(
        (node: HTMLElement | null) => {
            observer.current?.disconnect();
            if (!node) return;
            observer.current = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && more(), { rootMargin: '600px 0px' });
            observer.current.observe(node);
        },
        [more],
    );
    useEffect(() => () => observer.current?.disconnect(), []);

    return { visible: hasMore ? items.slice(0, count) : items, hasMore, sentinel, more };
}
