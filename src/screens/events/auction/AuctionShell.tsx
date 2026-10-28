import { Link, useLocation } from 'react-router-dom';
import { useEffect, type ReactNode } from 'react';
import { initials } from '../../../lib/auction';
import playpassLogo from '../../../assets/logo-white-v2-cropped.png';
import courtCollectiveLogo from '../../../assets/court-collective-logo.png';
import '../registration-identical.css';
import './auction.css';

// Public pages only — the organizer console lives in the organizer app and
// auction admin in the admin dashboard.
const tabsFor = (slug: string): { href: string; label: string }[] => [
    { href: `/events/${slug}/auction/live`, label: 'Live' },
    { href: `/events/${slug}/auction/team`, label: 'Team View' },
];

export function TeamLogo({ name, logoUrl, size = 28 }: { name: string; logoUrl: string | null; size?: number }) {
    const style = { width: size, height: size, fontSize: size * 0.36 };
    if (logoUrl) return <img src={logoUrl} alt="" className="rounded-full object-cover shrink-0" style={style} />;
    return (
        <span
            aria-hidden="true"
            className="rounded-full shrink-0 grid place-items-center font-semibold"
            style={{ ...style, background: 'var(--secondary)', color: 'var(--muted-foreground)' }}
        >
            {initials(name).slice(0, 2)}
        </span>
    );
}

export default function AuctionShell({
    slug,
    kicker = 'THE COURT COLLECTIVE 2026 · PLAYER AUCTION',
    title,
    right,
    children,
}: {
    slug: string;
    kicker?: string;
    title: string;
    right?: ReactNode;
    children: ReactNode;
}) {
    const location = useLocation();

    // Matches the page's own dark background behind any unfilled viewport
    // space, same as the prototype's `pp-console-page` body class.
    useEffect(() => {
        document.body.classList.add('pp-console-page');
        return () => document.body.classList.remove('pp-console-page');
    }, []);

    return (
        <div className="ccreg pp-console">
            <header className="site-header-like">
                <Link to="/the-court-collective" className="wordmark" aria-label="The Court Collective — home">
                    <img src={courtCollectiveLogo} alt="The Court Collective" className="brand-logo" />
                </Link>
                <div className="header-right">
                    <span className="powered-by">
                        <span className="powered-by-label">Powered by</span>
                        <img src={playpassLogo} alt="PlayPass" className="playpass-logo" />
                    </span>
                </div>
            </header>

            <main className="auction-main">
                <nav className="auction-shell-nav" aria-label="Auction pages">
                    {tabsFor(slug).map((t) => (
                        <Link key={t.href} to={t.href} className={location.pathname.endsWith(t.href.slice(t.href.indexOf('/auction/'))) ? 'active' : ''}>
                            {t.label}
                        </Link>
                    ))}
                </nav>

                <div className="auction-heading">
                    <div>
                        <p className="section-kicker">{kicker}</p>
                        <h1>{title}</h1>
                    </div>
                    {right}
                </div>

                {children}

                <footer className="site-footer">
                    <span>Copyright PlayPass</span>
                    <span>Auction · The Court Collective 2026</span>
                </footer>
            </main>
        </div>
    );
}
