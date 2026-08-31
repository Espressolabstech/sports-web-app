import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Trophy } from 'lucide-react';
import { getEvents } from '../../api/adapters/events';
import { EventCard } from '../../components/EventCard';
import { BottomNav } from '../../components/BottomNav';
import { AnimatedLoader } from '../../components/AnimatedLoader';
import { getToken } from '../../utils/cookies.helpers';

export default function EventsList() {
    const navigate = useNavigate();
    const user = !!getToken();

    const { data, isLoading } = useQuery({
        queryKey: ['events'],
        queryFn: getEvents,
    });

    const events = data?.data?.events ?? [];
    const live = events.filter((e) => e.phase === 'LIVE');
    const upcoming = events.filter((e) => e.phase === 'PUBLISHED');
    const past = events.filter((e) => e.phase === 'COMPLETED');

    return (
        <div className="min-h-screen bg-background pb-24">
            <div className="mx-auto max-w-4xl">
                <div className="relative px-5 pb-9 pt-[2.1rem] rounded-b-3xl overflow-hidden bg-[linear-gradient(90deg,rgba(38,117,148,1)_0%,rgba(16,45,69,1)_70%)]">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h1 className="text-[22px] font-bold tracking-tight text-white leading-none">
                                Tournaments
                            </h1>
                            <p className="mt-2.5 text-xs font-medium text-white/80">
                                Socials and tournaments near you
                            </p>
                        </div>
                        {!user && (
                            <button
                                onClick={() => navigate('/login')}
                                className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0F172A] shadow-sm transition-colors hover:bg-white/90"
                            >
                                Log in
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <main className="mx-auto max-w-xl space-y-6 px-4 pt-6">
                {isLoading ? (
                    <AnimatedLoader />
                ) : (
                    <>
                        {live.length > 0 && (
                            <section>
                                <h2 className="mb-3 text-[15px] font-medium tracking-tight text-muted-foreground">
                                    Happening now
                                </h2>
                                <div className="space-y-3">
                                    {live.map((e) => (
                                        <EventCard key={e.id} event={e} />
                                    ))}
                                </div>
                            </section>
                        )}

                        <section>
                            <h2 className="mb-3 text-[15px] font-medium tracking-tight text-muted-foreground">
                                Upcoming
                            </h2>
                            {upcoming.length === 0 ? (
                                <div className="rounded-2xl border border-dashed bg-card p-8 text-center">
                                    <Trophy className="mx-auto h-6 w-6 text-muted-foreground" />
                                    <p className="mt-3 text-sm font-medium text-foreground">
                                        Nothing scheduled yet
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Check back soon for new tournaments.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {upcoming.map((e) => (
                                        <EventCard key={e.id} event={e} />
                                    ))}
                                </div>
                            )}
                        </section>

                        {past.length > 0 && (
                            <section>
                                <h2 className="mb-3 text-[15px] font-medium tracking-tight text-muted-foreground">
                                    Past results
                                </h2>
                                <div className="space-y-3">
                                    {past.map((e) => (
                                        <EventCard key={e.id} event={e} />
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </main>

            <BottomNav />
        </div>
    );
}
