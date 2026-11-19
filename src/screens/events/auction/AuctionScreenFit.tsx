import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/** The narrowest layout (the normal desktop width) and the widest one a very wide screen gets. */
const MIN_WIDTH = 1240;
const MAX_WIDTH = 2560;

/**
 * Big-screen mode (the LED wall / projector). Two steps:
 * 1. Shape — the page is laid out as wide as the screen's shape asks for (a wide LED wall gets a wider layout, so the
 *    cards spread out instead of leaving empty bands at the sides).
 * 2. Size — the laid-out page is then scaled as one piece to fill the window, and kept centred.
 */
export function AuctionScreenFit({ children }: { children: ReactNode }) {
    const inner = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(MIN_WIDTH);
    const [scale, setScale] = useState(1);
    // Width tweaks allowed for the current window size (a new width can change the height, and so the wanted width).
    const tweaks = useRef(0);

    useLayoutEffect(() => {
        const el = inner.current;
        if (!el) return;
        const update = () => {
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            // Layout size, before scaling (a transform doesn't change offsetWidth/offsetHeight).
            const w = el.offsetWidth;
            const h = el.offsetHeight;
            if (!w || !h || !vw || !vh) return;
            // The width whose shape matches the screen at the page's current height.
            const wanted = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round((h * vw) / vh)));
            if (Math.abs(wanted - w) > 16 && tweaks.current < 4) {
                tweaks.current++;
                setWidth(wanted); // re-laid out → the observer calls update again with the new size
                return;
            }
            setScale(Math.min(vw / w, vh / h));
        };
        update();
        // The page grows and shrinks as players are sold (squads, the player on the block): refit every time.
        const observer = new ResizeObserver(update);
        observer.observe(el);
        const onResize = () => {
            tweaks.current = 0;
            update();
        };
        window.addEventListener('resize', onResize);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', onResize);
        };
    }, []);

    return (
        <div className="pp-screen-fit">
            <div ref={inner} className="pp-screen-fit-inner" style={{ width, transform: `translate(-50%, -50%) scale(${scale})` }}>
                {children}
            </div>
        </div>
    );
}
