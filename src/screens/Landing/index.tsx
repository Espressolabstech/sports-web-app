import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { submitContactInterest } from '../../lib/contact';
import playPassLogo from '../../assets/playpass-logo-white-full.png';

const audiences = [
    {
        index: '01',
        title: 'Venues',
        body: 'Courts, clubs and studios that want the whole day run from one place — availability, bookings, check-ins, memberships and settlements, without spreadsheets or manual tallying.',
    },
    {
        index: '02',
        title: 'Hosts',
        body: 'Tournament and league hosts who need draws, schedules, live scoring and standings that stay correct while play is moving across every court.',
    },
    {
        index: '03',
        title: 'Supporting organizers',
        body: 'Academies, circuits and community organizers running games across many venues, who need one dependable view of registrations, payments and results.',
    },
];

const capabilities = [
    'Scheduling and availability',
    'Registrations and entry fees',
    'Draws and match pairing',
    'Live scoring and results',
    'Standings and records',
    'Check-ins and settlements',
];

export default function Landing() {
    const [email, setEmail] = useState('');
    const [honeypot, setHoneypot] = useState('');
    const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle');
    const [error, setError] = useState<string | null>(null);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (status === 'sending') return;
        setError(null);
        setStatus('sending');

        const result = await submitContactInterest({
            email,
            source: 'homepage',
            honeypot,
        });

        if (result.ok) {
            setStatus('done');
        } else {
            setError(result.message ?? "We couldn't send that just now. Please try again.");
            setStatus('idle');
        }
    };

    return (
        <div className="min-h-screen bg-[hsl(var(--event-ink))] text-primary-foreground">
            <div className="mx-auto max-w-2xl px-6 pb-14 pt-6 md:px-10 md:pb-24 md:pt-8">
                {/* ═══════ HEADER ═══════ */}
                <header className="home-rise flex items-center justify-between" style={{ animationDelay: '0s' }}>
                    <img src={playPassLogo} alt="PlayPass" className="h-7 w-auto object-contain md:h-8" />
                    <span className="hidden font-mono text-[10px] uppercase tracking-[0.28em] text-primary-foreground/40 sm:block">
                        Sports technology
                    </span>
                </header>

                {/* ═══════ STATEMENT ═══════ */}
                <section className="mt-16 md:mt-24">
                    <p
                        className="home-rise text-[11px] font-semibold uppercase tracking-[0.28em] text-[hsl(var(--event-accent))]"
                        style={{ animationDelay: '0.1s' }}
                    >
                        Technology providers for the sports industry
                    </p>
                    <h1
                        className="home-rise mt-5 text-[34px] font-extrabold leading-[1.06] tracking-tight md:text-[52px]"
                        style={{ animationDelay: '0.18s' }}
                    >
                        The technology layer for courts, clubs and competitions.
                    </h1>
                    <p
                        className="home-rise mt-6 max-w-xl text-[16px] leading-relaxed text-primary-foreground/70 md:text-lg"
                        style={{ animationDelay: '0.26s' }}
                    >
                        PlayPass builds the systems behind the game. Venues, hosts and supporting organizers
                        use them to run and manage every match — from the first registration to the final
                        score — without the manual work that usually comes with it.
                    </p>
                </section>

                {/* ═══════ WHO WE BUILD FOR ═══════ */}
                <section className="mt-16 md:mt-24">
                    <h2
                        className="home-rise text-[11px] font-semibold uppercase tracking-[0.28em] text-primary-foreground/40"
                        style={{ animationDelay: '0.34s' }}
                    >
                        Who we build for
                    </h2>

                    <div className="mt-7 space-y-9 md:mt-9 md:space-y-11">
                        {audiences.map((audience, i) => (
                            <div
                                key={audience.title}
                                className="home-rise border-t border-primary-foreground/10 pt-6"
                                style={{ animationDelay: `${0.4 + i * 0.08}s` }}
                            >
                                <div className="flex items-baseline gap-3">
                                    <span className="font-mono text-[11px] text-[hsl(var(--event-accent))]">
                                        {audience.index}
                                    </span>
                                    <h3 className="text-xl font-bold tracking-tight md:text-2xl">{audience.title}</h3>
                                </div>
                                <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-primary-foreground/65 md:text-base">
                                    {audience.body}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ═══════ WHAT THE SYSTEMS HANDLE ═══════ */}
                <section className="mt-16 md:mt-24">
                    <h2
                        className="home-rise text-[11px] font-semibold uppercase tracking-[0.28em] text-primary-foreground/40"
                        style={{ animationDelay: '0.6s' }}
                    >
                        What the systems handle
                    </h2>

                    <ul className="mt-7 grid grid-cols-1 gap-x-8 sm:grid-cols-2 md:mt-9">
                        {capabilities.map((capability, i) => (
                            <li
                                key={capability}
                                className="home-rise flex items-center gap-3 border-b border-primary-foreground/10 py-3.5 text-[15px] text-primary-foreground/80"
                                style={{ animationDelay: `${0.66 + i * 0.05}s` }}
                            >
                                <Check className="h-4 w-4 shrink-0 text-[hsl(var(--event-accent))]" strokeWidth={2.5} />
                                {capability}
                            </li>
                        ))}
                    </ul>

                    <p
                        className="home-rise mt-8 max-w-lg text-[15px] leading-relaxed text-primary-foreground/60 md:mt-10 md:text-base"
                        style={{ animationDelay: '0.95s' }}
                    >
                        Everything runs under your own name and branding. You keep the relationship with your
                        players; we provide the systems underneath it.
                    </p>
                </section>

                {/* ═══════ CONTACT ═══════ */}
                <section
                    className="home-rise mt-16 rounded-2xl border border-primary-foreground/10 bg-primary-foreground/5 p-6 md:mt-24 md:p-9"
                    style={{ animationDelay: '1.05s' }}
                >
                    {status === 'done' ? (
                        <div className="flex flex-col items-center py-4 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--event-accent))]/15">
                                <Check className="h-6 w-6 text-[hsl(var(--event-accent))]" strokeWidth={2.5} />
                            </div>
                            <h2 className="mt-4 text-xl font-bold tracking-tight md:text-2xl">Thanks — we&apos;ve got it</h2>
                            <p className="mt-2 max-w-sm text-sm leading-relaxed text-primary-foreground/65 md:text-base">
                                We&apos;ll be in touch at {email} about how PlayPass can work for you.
                            </p>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-2xl font-extrabold leading-tight tracking-tight md:text-3xl">
                                Interested? Tell us where to reach you.
                            </h2>
                            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-primary-foreground/65 md:text-base">
                                If you run a venue, host events, or organize games that need better systems, leave
                                your email and we&apos;ll start the conversation.
                            </p>

                            <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
                                <Input
                                    type="email"
                                    required
                                    placeholder="you@club.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-14 flex-1 rounded-xl border-primary-foreground/20 bg-primary-foreground/10 px-4 text-base text-primary-foreground placeholder:text-primary-foreground/35 focus-visible:ring-2 focus-visible:ring-[hsl(var(--event-accent))]"
                                />
                                <Button
                                    type="submit"
                                    disabled={status === 'sending'}
                                    className="h-14 rounded-xl bg-[hsl(var(--event-accent))] px-7 text-base font-semibold text-[hsl(var(--event-ink))] hover:bg-[hsl(var(--event-accent))]/90 disabled:opacity-60"
                                >
                                    {status === 'sending' ? 'Sending…' : 'Get in touch'}
                                </Button>
                            </form>

                            {/* Honeypot for bots — never visible or focusable for people. */}
                            <input
                                type="text"
                                tabIndex={-1}
                                autoComplete="off"
                                aria-hidden="true"
                                value={honeypot}
                                onChange={(e) => setHoneypot(e.target.value)}
                                className="absolute h-0 w-0 opacity-0"
                            />

                            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
                        </>
                    )}
                </section>

                <footer className="mt-14 flex flex-col gap-1 border-t border-primary-foreground/10 pt-6 md:mt-20">
                    <p className="text-xs text-primary-foreground/40">© {new Date().getFullYear()} PlayPass</p>
                    <p className="text-xs text-primary-foreground/40">Technology for the sports industry.</p>
                </footer>
            </div>
        </div>
    );
}
