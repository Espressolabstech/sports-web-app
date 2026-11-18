import { useState, type FormEvent, type ReactNode } from 'react';
import { Button, Input } from '../../../components/pp-ui';
import { hasSquadsAccess, rememberSquadsAccess, SQUADS_CODE } from '../../../lib/auction-player-cards';
import AuctionShell from './AuctionShell';

/** The Squads link isn't fully public: the viewer enters the code first. Checked in the browser; this device remembers it. */
export function AuctionSquadsGate({ slug, children }: { slug: string; children: ReactNode }) {
    const [open, setOpen] = useState(() => hasSquadsAccess(slug));
    const [entry, setEntry] = useState('');
    const [error, setError] = useState<string | null>(null);

    if (open) return <>{children}</>;

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const value = entry.trim();
        if (!value) return setError('Enter the code.');
        if (value !== SQUADS_CODE) return setError('That code isn’t right.');
        rememberSquadsAccess(slug);
        setOpen(true);
    };

    return (
        <AuctionShell slug={slug} title="PLAYERS" nav={false}>
            <form className="pp-squads-gate" onSubmit={submit}>
                <label htmlFor="squads-code" className="hub-label">
                    Enter code to view players
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
                    <Button type="submit">View players</Button>
                </div>
                {error && (
                    <p id="squads-code-error" className="pp-squads-gate-error" role="alert">
                        {error}
                    </p>
                )}
            </form>
        </AuctionShell>
    );
}
