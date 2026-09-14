import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { CalendarCheck, Trophy, Users, TrendingUp, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { submitVenueApplication } from '../../api/adapters/auth';
import logoWhite from '../../assets/logo-white-v2.png';

const benefits = [
    {
        icon: CalendarCheck,
        title: 'Simplified bookings',
        description: 'Let players reserve courts and classes directly from your branded venue page.',
    },
    {
        icon: Trophy,
        title: 'Tournament hosting',
        description: 'Run Padel and Pickleball events end-to-end — registrations, draws, live scores and standings.',
    },
    {
        icon: Users,
        title: 'Player management',
        description: 'Track check-ins, memberships, credit packs and player insights in one place.',
    },
    {
        icon: TrendingUp,
        title: 'Grow occupancy',
        description: 'Fill more slots with waitlists, open-to-cancel, and automated reminders.',
    },
];

export default function ForVenues() {
    const [email, setEmail] = useState('');

    const { mutate: apply, isPending, isSuccess } = useMutation({
        mutationFn: () => submitVenueApplication({ email: email.trim() }),
        onError: (error: { message: string }) => toast.error(error.message),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !email.includes('@')) return;
        apply();
    };

    return (
        <div
            className="min-h-screen text-primary-foreground"
            style={{ backgroundColor: 'hsl(var(--event-ink))' }}
        >
            <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-12 md:py-20">
                <img
                    src={logoWhite}
                    alt="PlayPass"
                    className="h-7 w-[78px] object-contain md:h-8 md:w-[89px]"
                />

                <div className="mt-12 flex-1 md:mt-16">
                    <p
                        className="text-sm font-semibold uppercase tracking-wider"
                        style={{ color: 'hsl(var(--flow-accent))' }}
                    >
                        For venues
                    </p>
                    <h1 className="mt-3 text-3xl font-bold leading-tight md:text-5xl">
                        Fill more slots. Run better events.
                    </h1>
                    <p className="mt-4 max-w-xl text-base leading-relaxed text-primary-foreground/80 md:text-lg">
                        PlayPass gives courts, clubs and studios everything they need to manage
                        bookings, host tournaments, and build a loyal player community — all
                        from one place.
                    </p>

                    <div className="mt-10 grid gap-5 sm:grid-cols-2">
                        {benefits.map((b) => (
                            <div
                                key={b.title}
                                className="rounded-2xl border border-primary-foreground/10 bg-primary-foreground/5 p-5"
                            >
                                <b.icon className="h-6 w-6" style={{ color: 'hsl(var(--flow-accent))' }} />
                                <h3 className="mt-3 text-base font-semibold">{b.title}</h3>
                                <p className="mt-1 text-sm leading-relaxed text-primary-foreground/70">
                                    {b.description}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 rounded-2xl border border-primary-foreground/10 bg-primary-foreground/5 p-6 md:p-8">
                        {isSuccess ? (
                            <div className="flex flex-col items-center justify-center py-6 text-center">
                                <div
                                    className="flex h-12 w-12 items-center justify-center rounded-full"
                                    style={{ backgroundColor: 'hsl(var(--flow-accent)/0.2)' }}
                                >
                                    <CheckCircle2 className="h-6 w-6" style={{ color: 'hsl(var(--flow-accent))' }} />
                                </div>
                                <h2 className="mt-4 text-xl font-semibold">Thanks for your interest</h2>
                                <p className="mt-2 max-w-sm text-sm text-primary-foreground/70">
                                    Our team will reach out to {email} shortly with more information
                                    about PlayPass for venues.
                                </p>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-lg font-semibold md:text-xl">
                                    Are you a venue? Let's talk.
                                </h2>
                                <p className="mt-1 text-sm text-primary-foreground/70">
                                    Submit your email and we'll share how PlayPass can work for your
                                    space.
                                </p>
                                <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row">
                                    <Input
                                        type="email"
                                        required
                                        placeholder="you@venue.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="h-12 flex-1 rounded-xl border-primary-foreground/20 bg-primary-foreground/10 px-4 text-primary-foreground placeholder:text-primary-foreground/40 focus-visible:ring-[hsl(var(--flow-accent))]"
                                    />
                                    <Button
                                        type="submit"
                                        disabled={isPending}
                                        className="h-12 rounded-xl px-7 font-semibold disabled:opacity-60"
                                        style={{
                                            backgroundColor: 'hsl(var(--flow-accent))',
                                            color: 'hsl(var(--event-ink))',
                                        }}
                                    >
                                        {isPending ? 'Submitting…' : 'Learn more'}
                                    </Button>
                                </form>
                            </>
                        )}
                    </div>
                </div>

                <p className="mt-12 text-center text-xs text-primary-foreground/40">
                    © {new Date().getFullYear()} PlayPass. All rights reserved.
                </p>
            </div>
        </div>
    );
}
