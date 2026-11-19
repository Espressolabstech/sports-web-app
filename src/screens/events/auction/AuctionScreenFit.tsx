import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/** The narrowest layout (the normal desktop width) and the widest one a very wide screen gets. */
const MIN_WIDTH = 1240;
const MAX_WIDTH = 2560;
/** On-site fine-tuning (LED controllers often crop or stretch the signal), remembered on this computer. */
const ADJUST_KEY = 'pp-screen-adjust';
type Adjust = { zoom: number; x: number; y: number };
const NO_ADJUST: Adjust = { zoom: 1, x: 0, y: 0 };

function loadAdjust(): Adjust {
    try {
        const saved = JSON.parse(localStorage.getItem(ADJUST_KEY) ?? 'null') as Partial<Adjust> | null;
        if (saved && typeof saved.zoom === 'number') return { zoom: saved.zoom, x: Number(saved.x) || 0, y: Number(saved.y) || 0 };
    } catch {
        /* storage blocked or bad value: no adjustment */
    }
    return NO_ADJUST;
}
function saveAdjust(a: Adjust) {
    try {
        localStorage.setItem(ADJUST_KEY, JSON.stringify(a));
    } catch {
        /* storage blocked: the adjustment lasts until the page reloads */
    }
}

/**
 * Big-screen mode (the LED wall / projector). Three steps:
 * 1. Shape — the page is laid out as wide as the screen's shape asks for (a wide LED wall gets a wider layout, so the
 *    cards spread out instead of leaving empty bands at the sides).
 * 2. Size — the laid-out page is scaled as one piece to fill the window, and kept centred.
 * 3. Fine-tune on site — − / + shrink or grow it, the arrow keys move it (Shift for bigger steps), 0 resets. For LED
 *    controllers that show only part of the signal. Remembered on this computer.
 */
export function AuctionScreenFit({ children }: { children: ReactNode }) {
    const inner = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(MIN_WIDTH);
    const [scale, setScale] = useState(1);
    const [adjust, setAdjust] = useState<Adjust>(loadAdjust);
    const [hint, setHint] = useState(false);
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

    // On-site fine-tuning from the keyboard.
    useEffect(() => {
        let hideHint: ReturnType<typeof setTimeout> | undefined;
        const onKey = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey || e.altKey) return; // leave browser shortcuts alone
            const step = e.shiftKey ? 50 : 10;
            const change: Record<string, (a: Adjust) => Adjust> = {
                '-': (a) => ({ ...a, zoom: Math.max(0.5, +(a.zoom - 0.02).toFixed(2)) }),
                _: (a) => ({ ...a, zoom: Math.max(0.5, +(a.zoom - 0.02).toFixed(2)) }),
                '+': (a) => ({ ...a, zoom: Math.min(1.5, +(a.zoom + 0.02).toFixed(2)) }),
                '=': (a) => ({ ...a, zoom: Math.min(1.5, +(a.zoom + 0.02).toFixed(2)) }),
                ArrowUp: (a) => ({ ...a, y: a.y - step }),
                ArrowDown: (a) => ({ ...a, y: a.y + step }),
                ArrowLeft: (a) => ({ ...a, x: a.x - step }),
                ArrowRight: (a) => ({ ...a, x: a.x + step }),
                '0': () => NO_ADJUST,
            };
            const apply = change[e.key];
            if (!apply) return;
            e.preventDefault();
            setAdjust((a) => {
                const next = apply(a);
                saveAdjust(next);
                return next;
            });
            setHint(true);
            clearTimeout(hideHint);
            hideHint = setTimeout(() => setHint(false), 2500);
        };
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
            clearTimeout(hideHint);
        };
    }, []);

    return (
        <div className="pp-screen-fit">
            <div
                ref={inner}
                className="pp-screen-fit-inner"
                style={{
                    width,
                    transform: `translate(calc(-50% + ${adjust.x}px), calc(-50% + ${adjust.y}px)) scale(${scale * adjust.zoom})`,
                }}
            >
                {children}
            </div>
            {hint && (
                <div className="pp-screen-hint" role="status">
                    Size {Math.round(adjust.zoom * 100)}% · −/+ size · arrows move (Shift = faster) · 0 reset
                </div>
            )}
        </div>
    );
}
