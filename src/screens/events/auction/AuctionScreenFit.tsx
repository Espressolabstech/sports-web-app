import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/** The page is laid out at its normal desktop width, then scaled as one piece to fill the screen. */
const DESIGN_WIDTH = 1240;

/**
 * Big-screen mode (the LED wall / projector): scales the page to fit the whole window — width or height, whichever runs
 * out first — and keeps it centred, so it fills any screen size or shape without browser zoom.
 */
export function AuctionScreenFit({ children }: { children: ReactNode }) {
    const inner = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    useLayoutEffect(() => {
        const el = inner.current;
        if (!el) return;
        const update = () => {
            // Layout size, before scaling (a transform doesn't change offsetWidth/offsetHeight).
            const s = Math.min(window.innerWidth / el.offsetWidth, window.innerHeight / el.offsetHeight);
            setScale(Number.isFinite(s) && s > 0 ? s : 1);
        };
        update();
        // The page grows and shrinks as players are sold (squads, the player on the block): refit every time.
        const observer = new ResizeObserver(update);
        observer.observe(el);
        window.addEventListener('resize', update);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', update);
        };
    }, []);

    return (
        <div className="pp-screen-fit">
            <div ref={inner} className="pp-screen-fit-inner" style={{ width: DESIGN_WIDTH, transform: `translate(-50%, -50%) scale(${scale})` }}>
                {children}
            </div>
        </div>
    );
}
