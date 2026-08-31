import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Instagram, UserRound } from 'lucide-react';
import { fetchEvent } from '../../lib/public-events';

export default function EventHosts() {
    const { slug } = useParams();
    const navigate = useNavigate();

    const { data: event } = useQuery({
        queryKey: ['public-event', slug],
        queryFn: () => fetchEvent(slug!),
        enabled: !!slug,
    });

    return (
        <div className="min-h-screen pb-16" style={{ backgroundColor: 'hsl(var(--event-ink))' }}>
            <header className="mx-auto flex max-w-lg items-center gap-3 px-4 pt-4">
                <button
                    onClick={() => navigate(event ? `/events/${event.slug}` : '/events')}
                    aria-label="Back"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full active:scale-95"
                    style={{ backgroundColor: 'hsl(var(--event-ink-soft))' }}
                >
                    <ArrowLeft className="h-5 w-5" style={{ color: 'hsl(var(--event-on-ink))' }} />
                </button>
                <div className="min-w-0">
                    <h1
                        className="text-[20px] font-black uppercase leading-tight tracking-tight"
                        style={{ color: 'hsl(var(--event-on-ink))' }}
                    >
                        Hosts
                    </h1>
                    {event && (
                        <p className="truncate text-[13px]" style={{ color: 'hsl(var(--event-on-ink-muted))' }}>
                            {event.title}
                        </p>
                    )}
                </div>
            </header>

            <main className="mx-auto max-w-lg space-y-4 px-4 pt-5">
                {event && event.hosts.length === 0 && (
                    <div
                        className="rounded-2xl px-6 py-14 text-center"
                        style={{ backgroundColor: 'hsl(var(--event-ink-soft))' }}
                    >
                        <UserRound className="mx-auto h-8 w-8" style={{ color: 'hsl(var(--event-lime))' }} />
                        <p className="mt-3 text-[15px] font-semibold" style={{ color: 'hsl(var(--event-on-ink))' }}>
                            No host details yet
                        </p>
                    </div>
                )}

                {event?.hosts.map((h) => (
                    <article
                        key={h.name}
                        className="overflow-hidden rounded-2xl"
                        style={{ backgroundColor: 'hsl(var(--event-ink-soft))' }}
                    >
                        {h.photoUrl ? (
                            <img
                                src={h.photoUrl}
                                alt={h.name}
                                loading="lazy"
                                className="aspect-[4/3] w-full object-cover object-top"
                            />
                        ) : (
                            <div
                                className="flex aspect-[4/3] w-full items-center justify-center"
                                style={{ backgroundColor: 'hsl(var(--event-on-ink)/0.06)' }}
                            >
                                <UserRound className="h-10 w-10" style={{ color: 'hsl(var(--event-lime))' }} />
                            </div>
                        )}
                        <div className="p-4">
                            <p
                                className="text-[17px] font-bold leading-tight"
                                style={{ color: 'hsl(var(--event-on-ink))' }}
                            >
                                {h.name}
                            </p>
                            <p
                                className="text-[12px] uppercase tracking-wide"
                                style={{ color: 'hsl(var(--event-lime))' }}
                            >
                                Tournament host
                            </p>
                            {h.description && (
                                <p
                                    className="mt-2.5 text-[14px] leading-relaxed"
                                    style={{ color: 'hsl(var(--event-on-ink-muted))' }}
                                >
                                    {h.description}
                                </p>
                            )}

                            {h.instagram && (
                                <div className="mt-4">
                                    <a
                                        href={h.instagram}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex h-12 items-center justify-center gap-2 rounded-xl text-[14px] font-semibold active:scale-[0.99]"
                                        style={{
                                            backgroundColor: 'hsl(var(--event-on-ink)/0.08)',
                                            color: 'hsl(var(--event-on-ink))',
                                        }}
                                    >
                                        <Instagram className="h-4 w-4" style={{ color: 'hsl(var(--event-lime))' }} />
                                        Instagram
                                    </a>
                                </div>
                            )}
                        </div>
                    </article>
                ))}

                {event && (
                    <Link
                        to={`/events/${event.slug}`}
                        className="block py-2 text-center text-[13px] font-medium"
                        style={{ color: 'hsl(var(--event-on-ink-muted))' }}
                    >
                        Back to {event.title}
                    </Link>
                )}
            </main>
        </div>
    );
}
