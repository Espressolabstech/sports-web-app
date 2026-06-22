import { cn } from '../utils/twMerge';

interface AnimatedLoaderProps {
    label?: string;
    className?: string;
    accentClassName?: string;
    dotClassName?: string;
    size?: number;
}

export function AnimatedLoader({
    label,
    className,
    accentClassName,
    dotClassName,
    size = 140,
}: AnimatedLoaderProps) {
    const ballColor = accentClassName ?? dotClassName ?? 'text-primary';
    const height = size * 0.62;

    return (
        <div className={cn('flex flex-col items-center justify-center gap-5', className)}>
            <style>{`
                @keyframes venue-draw {
                    0%            { stroke-dashoffset: 1; opacity: 0.95; }
                    55%, 75%      { stroke-dashoffset: 0; opacity: 1;    }
                    92%, 100%     { stroke-dashoffset: 0; opacity: 0;    }
                }
                @keyframes venue-ball {
                    0%, 60%   { opacity: 0; transform: translate(0, 4px) scale(0.7); }
                    72%       { opacity: 1; transform: translate(0, 0)   scale(1);   }
                    88%       { opacity: 1; transform: translate(0, 0)   scale(1);   }
                    100%      { opacity: 0; transform: translate(0, 0)   scale(1);   }
                }
                @keyframes venue-fill {
                    0%, 55%   { opacity: 0; }
                    72%, 88%  { opacity: 0.06; }
                    100%      { opacity: 0; }
                }
                .venue-line {
                    stroke-dasharray: 1;
                    stroke-dashoffset: 1;
                    animation: venue-draw 2.6s cubic-bezier(0.65, 0, 0.35, 1) infinite;
                }
            `}</style>

            <svg
                viewBox="0 0 200 124"
                style={{ width: size, height }}
                className="text-foreground/85"
                aria-hidden="true"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <rect
                    x="10" y="14" width="180" height="96" rx="4"
                    fill="currentColor"
                    style={{ animation: 'venue-fill 2.6s ease-in-out infinite' }}
                />
                <rect
                    className="venue-line"
                    x="10" y="14" width="180" height="96" rx="4"
                    stroke="currentColor" strokeWidth="1.6" pathLength="1"
                    style={{ animationDelay: '0s' }}
                />
                <line
                    className="venue-line"
                    x1="100" y1="20" x2="100" y2="104"
                    stroke="currentColor" strokeWidth="1.4" pathLength="1"
                    style={{ animationDelay: '0.3s' }}
                />
                <rect
                    className="venue-line"
                    x="34" y="38" width="132" height="48" rx="2"
                    stroke="currentColor" strokeWidth="1.2" pathLength="1"
                    style={{ animationDelay: '0.5s' }}
                />
                <circle
                    className="venue-line"
                    cx="100" cy="62" r="2.4"
                    stroke="currentColor" strokeWidth="1.1" pathLength="1"
                    style={{ animationDelay: '0.7s' }}
                />
                {[
                    { x1: 10,  y1: 24,  x2: 10,  y2: 32,  d: 0.85 },
                    { x1: 10,  y1: 14,  x2: 18,  y2: 14,  d: 0.85 },
                    { x1: 190, y1: 24,  x2: 190, y2: 32,  d: 0.9  },
                    { x1: 182, y1: 14,  x2: 190, y2: 14,  d: 0.9  },
                    { x1: 10,  y1: 92,  x2: 10,  y2: 100, d: 0.95 },
                    { x1: 10,  y1: 110, x2: 18,  y2: 110, d: 0.95 },
                    { x1: 190, y1: 92,  x2: 190, y2: 100, d: 1.0  },
                    { x1: 182, y1: 110, x2: 190, y2: 110, d: 1.0  },
                ].map((l, i) => (
                    <line
                        key={i}
                        className="venue-line"
                        x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                        stroke="currentColor" strokeWidth="1.1" pathLength="1"
                        style={{ animationDelay: `${l.d}s` }}
                    />
                ))}
                <circle
                    cx="100" cy="62" r="3.2"
                    className={ballColor}
                    fill="currentColor"
                    style={{
                        transformOrigin: '100px 62px',
                        animation: 'venue-ball 2.6s cubic-bezier(0.4, 0, 0.2, 1) infinite',
                    }}
                />
            </svg>

            {label && (
                <p className="text-[11px] font-medium tracking-[0.14em] uppercase text-muted-foreground/80">
                    {label}
                </p>
            )}
            <span className="sr-only">Loading…</span>
        </div>
    );
}

export default AnimatedLoader;
