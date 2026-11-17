import { useEffect, useRef, useState } from 'react';
import { Button } from '../../../components/pp-ui';
import { HubStats, HubTiles, HubTop } from './AuctionTeamHub';
import type { HubData } from './hub-data';

/** Full-screen 16:9 view for a projector: Teams and Stats, arrow keys to switch, Esc to leave. */
export function AuctionPresent({ a, onExit }: { a: HubData; onExit: () => void }) {
    const [view, setView] = useState<{ screen: 'teams' | 'stats'; forId: string | null }>({ screen: 'teams', forId: a.currentId });
    const ref = useRef<HTMLDivElement>(null);
    // A new player on the block brings the Teams screen back.
    const screen = a.currentId && a.currentId !== view.forId ? 'teams' : view.screen;
    const idRef = useRef(a.currentId);
    useEffect(() => {
        idRef.current = a.currentId;
    }, [a.currentId]);
    const setScreen = (next: 'teams' | 'stats') => setView({ screen: next, forId: idRef.current });
    useEffect(() => {
        ref.current?.requestFullscreen?.().catch(() => undefined);
        const key = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onExit();
            if (e.key === 'ArrowRight') setScreen('stats');
            if (e.key === 'ArrowLeft') setScreen('teams');
        };
        const fs = () => {
            if (!document.fullscreenElement) onExit();
        };
        window.addEventListener('keydown', key);
        document.addEventListener('fullscreenchange', fs);
        return () => {
            window.removeEventListener('keydown', key);
            document.removeEventListener('fullscreenchange', fs);
            if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
        };
    }, [onExit]);
    return (
        <div ref={ref} className="pp-console hub-present" role="dialog" aria-label="Present mode">
            <nav className="hub-present-nav">
                <span>THE COURT COLLECTIVE 2026 · LIVE AUCTION</span>
                <div>
                    <Button variant="ghost" aria-pressed={screen === 'teams'} onClick={() => setScreen('teams')}>
                        Teams
                    </Button>
                    <Button variant="ghost" aria-pressed={screen === 'stats'} onClick={() => setScreen('stats')}>
                        Stats
                    </Button>
                    <Button variant="outline" onClick={onExit}>
                        Exit
                    </Button>
                </div>
            </nav>
            {screen === 'teams' ? (
                <>
                    <HubTop a={a} />
                    <HubTiles a={a} />
                </>
            ) : (
                <HubStats a={a} />
            )}
        </div>
    );
}
