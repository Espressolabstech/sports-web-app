import { useId } from 'react';
import { cn } from '../utils/twMerge';

interface SlotsLoaderProps {
    label?: string;
    className?: string;
    accentClassName?: string;
    pillCount?: number;
}

export function SlotsLoader({
    label = 'Checking availability',
    className,
    accentClassName = 'text-primary',
    pillCount = 5,
}: SlotsLoaderProps) {
    const uid = useId().replace(/:/g, '');
    const pillWidth = 28;
    const gap = 6;
    const hopUnit = pillWidth + gap;
    const ballSize = 10;
    const totalWidth = pillCount * pillWidth + (pillCount - 1) * gap;

    const hopCount = pillCount - 1;
    const totalDuration = 2.9;
    const travelEnd = 78;
    const fadeEnd = 92;

    const samples = 56;
    const peakHeight = 17;
    const baseX = (pillWidth - ballSize) / 2;
    const endX = baseX + hopCount * hopUnit;

    const trajectoryFrames: string[] = [];
    for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const x = baseX + endX * t - baseX * t;
        const localHop = (t * hopCount) % 1;
        const arc = Math.sin(Math.PI * localHop);
        const y = -arc * peakHeight;
        const grounded = Math.pow(1 - arc, 6);
        const squashX = 1 + 0.04 * grounded;
        const squashY = 1 - 0.04 * grounded;
        const pct = t * travelEnd;
        const opacity = pct < 4 ? 0.35 + (pct / 4) * 0.65 : 1;
        trajectoryFrames.push(
            `${pct.toFixed(3)}% { opacity: ${opacity.toFixed(2)}; transform: translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${squashX.toFixed(3)}, ${squashY.toFixed(3)}); }`,
        );
    }
    trajectoryFrames.push(
        `${fadeEnd}% { opacity: 0; transform: translate3d(${endX.toFixed(2)}px, 0, 0) scale(1, 1); }`,
    );
    trajectoryFrames.push(
        `100% { opacity: 0; transform: translate3d(${baseX.toFixed(2)}px, 0, 0) scale(1, 1); }`,
    );

    const fillKeyframes = Array.from({ length: pillCount }, (_, i) => {
        const arrive = pillCount === 1 ? 0 : (i / (pillCount - 1)) * travelEnd;
        const start = Math.max(0, arrive - 10);
        const full = Math.min(travelEnd, arrive + 7);

        return `
        @keyframes slots-fill-${uid}-${i} {
          0%, ${start.toFixed(2)}% { transform: scaleX(0.08); opacity: 0.28; }
          ${full.toFixed(2)}%, ${travelEnd}% { transform: scaleX(1); opacity: 0.9; }
          ${fadeEnd}% { transform: scaleX(0.18); opacity: 0.2; }
          100% { transform: scaleX(0.08); opacity: 0.28; }
        }`;
    }).join('\n');

    return (
        <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
            <style>{`
                @keyframes slots-ball-${uid} {
                  ${trajectoryFrames.join('\n          ')}
                }
                ${fillKeyframes}
                @keyframes slots-label-${uid} {
                  0%, 100% { opacity: 0.55; }
                  50%      { opacity: 1;    }
                }
            `}</style>

            <div
                className="relative"
                style={{ width: totalWidth, height: 36 }}
                aria-hidden="true"
            >
                <div className="absolute inset-x-0 bottom-0 flex items-end gap-1.5">
                    {Array.from({ length: pillCount }).map((_, i) => (
                        <div
                            key={i}
                            className="relative h-2.5 rounded-full bg-muted overflow-hidden"
                            style={{ width: pillWidth }}
                        >
                            <div
                                className={cn('absolute inset-0 rounded-full origin-left', accentClassName)}
                                style={{
                                    backgroundColor: 'currentColor',
                                    transform: 'scaleX(0.08)',
                                    animation: `slots-fill-${uid}-${i} ${totalDuration}s cubic-bezier(0.37, 0, 0.2, 1) infinite`,
                                }}
                            />
                        </div>
                    ))}
                </div>

                <div
                    className="absolute left-0 bottom-2"
                    style={{
                        width: ballSize,
                        height: ballSize,
                        transformOrigin: 'center bottom',
                        willChange: 'transform',
                        animation: `slots-ball-${uid} ${totalDuration}s linear infinite`,
                    }}
                >
                    <div
                        className={cn(
                            'h-full w-full rounded-full shadow-[0_2px_5px_rgba(0,0,0,0.18)]',
                            accentClassName,
                        )}
                        style={{ backgroundColor: 'currentColor' }}
                    />
                </div>
            </div>

            {label && (
                <p
                    className="text-[11px] font-medium tracking-[0.14em] uppercase text-muted-foreground/80"
                    style={{ animation: `slots-label-${uid} 1.8s ease-in-out infinite` }}
                >
                    {label}
                </p>
            )}
            <span className="sr-only">Loading available time slots…</span>
        </div>
    );
}

export default SlotsLoader;
