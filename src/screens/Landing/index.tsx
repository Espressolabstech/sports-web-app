import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Trophy, CalendarCheck, Store, ArrowUpRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '../../components/ui/sheet';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '../../components/ui/dialog';
import { path } from '../../navigation/commanPaths';
import logoWhite from '../../assets/logo-white-v2.png';
import imgTournaments from '../../assets/home-tournaments.jpg';
import imgBookings from '../../assets/home-bookings.jpg';
import imgVenues from '../../assets/home-venues.jpg';

const actions = [
    {
        index: '01',
        label: 'Tournaments',
        kicker: 'Compete',
        path: path.events,
        image: imgTournaments,
        description: 'Find and join Padel & Pickleball events near you',
    },
    {
        index: '02',
        label: 'Court Bookings',
        kicker: 'Reserve',
        comingSoon: true,
        image: imgBookings,
        description: 'Reserve courts at your favourite venues',
    },
    {
        index: '03',
        label: 'Are you a venue?',
        kicker: 'Partner',
        path: path.forVenues,
        image: imgVenues,
        description: 'Learn how PlayPass can help your business',
    },
];

export default function Landing() {
    const navigate = useNavigate();
    const [comingSoonOpen, setComingSoonOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <div className="flex min-h-screen flex-col" style={{ backgroundColor: 'hsl(var(--event-ink))' }}>
            {/* ═══════ HEADER ═══════ */}
            <header className="relative z-10 flex items-center justify-between px-5 py-4 md:px-8 md:py-5">
                <img
                    src={logoWhite}
                    alt="PlayPass"
                    className="h-8 w-[89px] object-contain md:h-10 md:w-[111px]"
                />

                <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                    <SheetTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 shrink-0 text-primary-foreground hover:bg-primary-foreground/10"
                            aria-label="Open menu"
                        >
                            <Menu className="h-7 w-7" strokeWidth={2} />
                        </Button>
                    </SheetTrigger>
                    <SheetContent
                        side="right"
                        className="w-[85%] max-w-sm border-primary-foreground/10 p-0"
                        style={{ backgroundColor: 'hsl(var(--event-ink-soft))' }}
                    >
                        <div className="flex h-full flex-col px-6 pb-8 pt-14">
                            <SheetHeader className="text-left">
                                <SheetTitle className="sr-only">PlayPass</SheetTitle>
                                <img
                                    src={logoWhite}
                                    alt="PlayPass"
                                    className="h-7 w-[78px] object-contain"
                                />
                            </SheetHeader>
                            <nav className="mt-8 space-y-2">
                                <button
                                    onClick={() => {
                                        setMenuOpen(false);
                                        navigate(path.events);
                                    }}
                                    className="flex h-14 w-full items-center gap-3 rounded-xl px-3 text-left text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/10"
                                >
                                    <Trophy className="h-5 w-5" style={{ color: 'hsl(var(--flow-accent))' }} />
                                    Tournaments
                                </button>
                                <button
                                    onClick={() => {
                                        setMenuOpen(false);
                                        setComingSoonOpen(true);
                                    }}
                                    className="flex h-14 w-full items-center gap-3 rounded-xl px-3 text-left text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/10"
                                >
                                    <CalendarCheck className="h-5 w-5" style={{ color: 'hsl(var(--flow-accent))' }} />
                                    Court Bookings
                                </button>
                                <button
                                    onClick={() => {
                                        setMenuOpen(false);
                                        navigate(path.forVenues);
                                    }}
                                    className="flex h-14 w-full items-center gap-3 rounded-xl px-3 text-left text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/10"
                                >
                                    <Store className="h-5 w-5" style={{ color: 'hsl(var(--flow-accent))' }} />
                                    For Venues
                                </button>
                            </nav>
                        </div>
                    </SheetContent>
                </Sheet>
            </header>

            {/* ═══════ MAIN ═══════ */}
            <main className="flex flex-1 flex-col justify-start px-5 pb-10 pt-3 md:px-8 md:pt-8">
                <div className="mx-auto w-full max-w-md md:max-w-lg">
                    <p className="home-rise mb-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-primary-foreground/40">
                        What are you here for?
                    </p>
                    <div className="space-y-3">
                        {actions.map((action, i) => (
                            <button
                                key={action.label}
                                onClick={() =>
                                    action.comingSoon ? setComingSoonOpen(true) : navigate(action.path!)
                                }
                                style={{ animationDelay: `${0.12 + i * 0.12}s` }}
                                className="home-rise group relative block w-full overflow-hidden rounded-2xl text-left outline-none transition-transform duration-300 active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-[hsl(var(--flow-accent))]"
                            >
                                <img
                                    src={action.image}
                                    alt=""
                                    loading="lazy"
                                    width={1024}
                                    height={640}
                                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                                />
                                <div
                                    className="absolute inset-0"
                                    style={{
                                        background:
                                            'linear-gradient(to right, hsl(var(--event-ink)), hsl(var(--event-ink)/0.78), hsl(var(--event-ink)/0.15))',
                                    }}
                                />
                                <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-primary-foreground/10 transition group-hover:ring-primary-foreground/25" />

                                <div className="relative flex min-h-[132px] flex-col justify-between p-5 md:min-h-[148px] md:p-6">
                                    <div className="flex items-start justify-between">
                                        <span
                                            className="text-[10px] font-semibold uppercase tracking-[0.3em]"
                                            style={{ color: 'hsl(var(--flow-accent))' }}
                                        >
                                            {action.kicker}
                                        </span>
                                        <span className="font-mono text-xs text-primary-foreground/35">
                                            {action.index}
                                        </span>
                                    </div>

                                    <div>
                                        <div className="flex items-end justify-between gap-3">
                                            <h2 className="text-[26px] font-extrabold leading-[1.05] tracking-tight text-primary-foreground md:text-3xl">
                                                {action.label}
                                            </h2>
                                            {action.comingSoon ? (
                                                <span className="mb-1 shrink-0 rounded-full border border-primary-foreground/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/80">
                                                    Soon
                                                </span>
                                            ) : (
                                                <span className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary-foreground/20 text-primary-foreground transition-all duration-300 group-hover:border-[hsl(var(--flow-accent))] group-hover:bg-[hsl(var(--flow-accent))] group-hover:text-[hsl(var(--event-ink))]">
                                                    <ArrowUpRight className="h-4 w-4" />
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-1.5 max-w-[26ch] text-[13px] leading-snug text-primary-foreground/60">
                                            {action.description}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </main>

            {/* ═══════ COMING SOON DIALOG ═══════ */}
            <Dialog open={comingSoonOpen} onOpenChange={setComingSoonOpen}>
                <DialogContent
                    className="border-primary-foreground/10 text-primary-foreground sm:max-w-sm"
                    style={{ backgroundColor: 'hsl(var(--event-ink-soft))' }}
                >
                    <DialogHeader>
                        <div
                            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
                            style={{ backgroundColor: 'hsl(var(--flow-accent)/0.15)' }}
                        >
                            <CalendarCheck className="h-7 w-7" style={{ color: 'hsl(var(--flow-accent))' }} />
                        </div>
                        <DialogTitle className="mt-4 text-center text-xl">Coming soon</DialogTitle>
                        <DialogDescription className="text-center text-primary-foreground/70">
                            Court bookings are launching shortly. Stay tuned for updates.
                        </DialogDescription>
                    </DialogHeader>
                    <Button
                        onClick={() => setComingSoonOpen(false)}
                        className="mt-2 h-12 w-full rounded-xl font-semibold"
                        style={{
                            backgroundColor: 'hsl(var(--flow-accent))',
                            color: 'hsl(var(--event-ink))',
                        }}
                    >
                        Got it
                    </Button>
                </DialogContent>
            </Dialog>
        </div>
    );
}
