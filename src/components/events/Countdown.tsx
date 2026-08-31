import { useEffect, useState } from 'react';

export interface CountdownParts {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

function diffParts(target: Date): CountdownParts {
    const ms = Math.max(0, target.getTime() - Date.now());
    const totalSeconds = Math.floor(ms / 1000);
    return {
        days: Math.floor(totalSeconds / 86400),
        hours: Math.floor((totalSeconds % 86400) / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: totalSeconds % 60,
    };
}

export function useCountdown(target: Date): CountdownParts {
    const [parts, setParts] = useState(() => diffParts(target));

    useEffect(() => {
        const interval = setInterval(() => setParts(diffParts(target)), 1000);
        return () => clearInterval(interval);
    }, [target]);

    return parts;
}
