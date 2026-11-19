import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button, Input } from '../../../components/pp-ui';
import { AnimatedLoader } from '../../../components/AnimatedLoader';
import { getAuctionPublicView } from '../../../api/adapters/auction';
import { AuctionCodeContext, isWrongCode, rememberAuctionCode, savedAuctionCode } from '../../../lib/auction-code';
import AuctionShell from './AuctionShell';

/** Asks the server whether a code opens this event's auction pages. */
async function check(slug: string, code: string): Promise<'ok' | 'wrong' | 'failed' | 'locked'> {
    try {
        await getAuctionPublicView(slug, code);
        return 'ok';
    } catch (error) {
        if (isWrongCode(error)) return 'wrong';
        return (error as { status?: number }).status === 429 ? 'locked' : 'failed';
    }
}

const MESSAGES = {
    wrong: 'That code isn’t right.',
    failed: 'Couldn’t check the code. Try again.',
    locked: 'Too many wrong codes. Try again in a few minutes.',
    changed: 'The code has changed. Enter the new code.',
} as const;

/**
 * The auction pages (Live Auction, Squads) aren't fully public: the viewer enters the code first, or opens a link with
 * ?code=…. The server checks it; this device remembers the code that worked, so one entry opens every auction page of the event.
 */
export function AuctionSquadsGate({
    slug,
    title = 'PLAYERS',
    nav = false,
    children,
}: {
    slug: string;
    title?: string;
    nav?: boolean;
    children: ReactNode;
}) {
    const [params] = useSearchParams();
    // A code from the link wins over a saved one (the organizer may have shared a new code).
    const [candidate] = useState(() => params.get('code')?.trim() || savedAuctionCode(slug));
    const [code, setCode] = useState<string | null>(null);
    const [checking, setChecking] = useState(!!candidate);
    const [entry, setEntry] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!candidate) return;
        let live = true;
        void check(slug, candidate).then((result) => {
            if (!live) return;
            if (result === 'ok') {
                rememberAuctionCode(slug, candidate);
                setCode(candidate);
            } else {
                if (result === 'wrong') rememberAuctionCode(slug, null);
                setError(MESSAGES[result === 'wrong' ? 'changed' : result]);
            }
            setChecking(false);
        });
        return () => {
            live = false;
        };
    }, [slug, candidate]);

    const forget = useCallback(() => {
        rememberAuctionCode(slug, null);
        setCode(null);
        setError(MESSAGES.changed);
    }, [slug]);
    const value = useMemo(() => (code ? { code, forget } : null), [code, forget]);

    if (value) return <AuctionCodeContext.Provider value={value}>{children}</AuctionCodeContext.Provider>;

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        const typed = entry.trim();
        if (!typed) return setError('Enter the code.');
        setChecking(true);
        setError(null);
        const result = await check(slug, typed);
        setChecking(false);
        if (result !== 'ok') return setError(MESSAGES[result]);
        rememberAuctionCode(slug, typed);
        setCode(typed);
    };

    return (
        <AuctionShell slug={slug} title={title} nav={nav}>
            {checking && !entry ? (
                <div className="flex justify-center py-16">
                    <AnimatedLoader />
                </div>
            ) : (
                <form className="pp-squads-gate" onSubmit={submit}>
                    <label htmlFor="squads-code" className="hub-label">
                        Enter the code to continue
                    </label>
                    <div className="pp-squads-gate-row">
                        <Input
                            id="squads-code"
                            inputMode="numeric"
                            autoComplete="off"
                            autoFocus
                            placeholder="Code"
                            value={entry}
                            onChange={(e) => setEntry(e.target.value)}
                            aria-invalid={!!error}
                            aria-describedby={error ? 'squads-code-error' : undefined}
                        />
                        <Button type="submit" disabled={checking}>
                            {checking && <Loader2 className="animate-spin" aria-hidden />}
                            {checking ? 'Checking…' : 'Continue'}
                        </Button>
                    </div>
                    {error && (
                        <p id="squads-code-error" className="pp-squads-gate-error" role="alert">
                            {error}
                        </p>
                    )}
                </form>
            )}
        </AuctionShell>
    );
}
