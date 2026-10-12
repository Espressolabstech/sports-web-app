import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
    ArrowRight,
    ArrowUpRight,
    CalendarDays,
    Clock3,
    Gavel,
    MapPin,
    CircleCheck,
    ShieldCheck,
    Info,
    Instagram,
    MessageCircle,
    Trophy,
} from 'lucide-react';
import type { TournamentEvent } from '../../lib/public-events';
import playpassLogo from '../../assets/logo-white-v2-cropped.png';
import courtCollectiveLogo from '../../assets/court-collective-logo.png';
import courtHero from '../../assets/court-hero.jpg';
import './registration-identical.css';

function RegisterButton({ href, full = false }: { href: string; full?: boolean }) {
    return (
        <Link to={href} className={full ? 'continue-btn full-cta' : 'continue-btn'}>
            Register as a player <ArrowRight size={16} />
        </Link>
    );
}

export default function EventLandingIdentical({
    event,
    registerHref,
}: {
    event: TournamentEvent;
    registerHref?: string;
}) {
    const href = registerHref ?? `/events/${event.slug}/register`;
    const dates =
        event.endDate && event.start.toDateString() !== event.endDate.toDateString()
            ? `${format(event.start, 'd MMM').toUpperCase()} — ${format(event.endDate, 'd MMM, yyyy').toUpperCase()}`
            : format(event.start, 'd MMM, yyyy').toUpperCase();

    return (
        <div className="ccreg">
            <header className="site-header-like">
                <Link to={`/events/${event.slug}`} className="wordmark" aria-label="The Court Collective — home">
                    <img src={courtCollectiveLogo} alt="The Court Collective" className="brand-logo" />
                </Link>
                <div className="header-right">
                    <span className="powered-by">
                        <span className="powered-by-label">Powered by</span>
                        <img src={playpassLogo} alt="PlayPass" className="playpass-logo" />
                    </span>
                </div>
            </header>

            <main className="home-main">
                <div className="page-width">
                    <section className="event-hero">
                        <img src={event.posterUrl || courtHero} alt={event.title} className="hero-photo" />
                        <div className="hero-overlay" />
                        <div className="hero-content">
                            <div className="eyebrow">
                                <span className="status-dot" /> PLAYER REGISTRATIONS OPEN{' '}
                                <span style={{ color: 'var(--muted-foreground)' }}> / INDIA'S FIRST</span>
                            </div>
                            <h1>
                                THE COURT
                                <br />
                                COLLECTIVE <span>2026.</span>
                            </h1>
                            <p className="hero-description">
                                First time in India: a league combining the 2 hottest new-gen sports,
                                Pickleball &amp; Padel.
                            </p>
                            <div className="sport-tags">
                                <span className="sport-tag">
                                    <Trophy size={12} /> PICKLEBALL
                                </span>
                                <span className="sport-tag">
                                    <Trophy size={12} /> PADEL
                                </span>
                            </div>
                            <div className="hero-cta">
                                <RegisterButton href={href} />
                                <small>
                                    All skill levels welcome.
                                    <br />
                                    Your game. Your opportunity.
                                </small>
                            </div>
                        </div>
                        <span className="hero-corner">
                            <MapPin size={13} /> {event.venueName.toUpperCase()}
                        </span>
                    </section>

                    <div className="info-strip">
                        <div className="info-item">
                            <CalendarDays />
                            <div>
                                <label>Tournament dates</label>
                                <strong>{dates}</strong>
                                <small>Two days. One collective.</small>
                            </div>
                        </div>
                        <div className="info-item">
                            <Gavel />
                            <div>
                                <label>Player auction</label>
                                <strong>23 OCTOBER, 2026</strong>
                                <small>Find your team.</small>
                            </div>
                        </div>
                        <div className="info-item">
                            <Clock3 />
                            <div>
                                <label>Register by</label>
                                <strong>20 OCTOBER, 2026</strong>
                                <small>Don't miss your spot.</small>
                            </div>
                        </div>
                        <div className="info-item">
                            <MapPin />
                            <div>
                                <label>The venue</label>
                                <strong>{event.venueName.toUpperCase()}</strong>
                                <small>See you on court.</small>
                            </div>
                        </div>
                    </div>

                    <div className="content-grid">
                        <section>
                            <p className="section-kicker">NOT YOUR USUAL TOURNAMENT</p>
                            <h2 className="section-title">GET PAID TO PLAY.</h2>
                            <p className="section-copy">
                                Every team has Pickleball players, Padel players and players who play
                                both. Team owners bid for players at the auction and build their squads.
                                You register, get picked, and play for your team.
                            </p>
                            <div className="steps">
                                {[
                                    ['01', 'Put your name in', 'Register and complete your player profile. Complete profiles get picked first.'],
                                    ['02', 'Get picked at auction', 'Team owners bid to build their squads. Registration does not guarantee a pick.'],
                                    ['03', 'Play. Compete. Get paid.', 'Represent your team and get paid your auction price — a minimum of ₹3,000.'],
                                ].map(([n, title, copy]) => (
                                    <div className="process-step" key={n}>
                                        <div className="process-number">
                                            {n} <ArrowUpRight size={14} className="inline float-right mt-2" style={{ color: 'var(--muted-foreground)' }} />
                                        </div>
                                        <h3>{title}</h3>
                                        <p>{copy}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="welcome-note">
                                <CircleCheck />
                                <div>
                                    <h3>New to the game? You're in good company.</h3>
                                    <p>
                                        All skill levels are welcome. The host will assign each player a
                                        level, and you will play against players of that level. The
                                        tournament format will be designed accordingly.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <aside className="fee-panel">
                            <div className="fee-eyebrow">YOUR PLACE IN THE AUCTION</div>
                            <div className="fee-price">₹{event.priceInr.toLocaleString('en-IN')}</div>
                            <p className="fee-label">Player registration fee</p>
                            <div className="fee-divider" />
                            <div className="fee-line">
                                <span>Auction base price</span>
                                <strong>₹3,000 / player</strong>
                            </div>
                            <p className="fee-detail">
                                Picked at the auction? You play for your team and get paid your auction
                                price.
                            </p>
                            <div className="fee-refund">
                                <ShieldCheck />
                                <span>
                                    Not picked? Get a <strong>100% refund</strong> within 10 days after
                                    the tournament ends.
                                </span>
                            </div>
                            <RegisterButton href={href} full />
                            <p className="fee-footer">Registration closes 20 October 2026</p>
                        </aside>
                    </div>

                    <section className="important-section">
                        <h3 className="important-heading">
                            <Info /> A FEW IMPORTANT THINGS
                        </h3>
                        <ul className="important-list">
                            <li>
                                All payments are non-refundable under any circumstances, except for
                                players not picked at the auction or if the organisers cancel the event.
                            </li>
                            <li>
                                Upon registering, you consent to being photographed and/or recorded.
                                Photo and video materials may be used for promotional purposes, including
                                on social media.
                            </li>
                            <li>
                                Participation is entirely voluntary and at your own risk. The organisers
                                will not be responsible for any injury, accident, loss, or damage during
                                the event.
                            </li>
                            <li>Players under 18 must have parent or guardian consent.</li>
                        </ul>
                    </section>

                    <footer className="site-footer">
                        <span>Copyright PlayPass</span>
                        <div className="footer-links">
                            <Link to={`/events/${event.slug}/host-preview`}>
                                Host preview <ArrowUpRight />
                            </Link>
                            <a href="https://www.instagram.com/gameday.events/" target="_blank" rel="noreferrer">
                                <Instagram /> @gameday.events <ArrowUpRight />
                            </a>
                            <a href="https://wa.me/919327362989" target="_blank" rel="noreferrer">
                                <MessageCircle /> WhatsApp +91-9327362989 <ArrowUpRight />
                            </a>
                        </div>
                    </footer>
                </div>
            </main>
        </div>
    );
}
