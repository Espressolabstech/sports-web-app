import { Link, useLocation } from 'react-router-dom';
import { useEffect, type ReactNode } from 'react';
import { initials } from '../../../lib/auction';
import playpassLogo from '../../../assets/logo-white-v2-cropped.png';
import courtCollectiveLogo from '../../../assets/court-collective-logo.png';
import '../registration-identical.css';
import '../../../components/pp-ui';

// The public pages. The organizer console lives in the organizer app and the
// auction admin in the admin dashboard.
const tabsFor = (slug: string): { href: string; label: string }[] => [
    { href: `/events/${slug}/auction/live`, label: 'Live' },
    { href: `/events/${slug}/auction/team`, label: 'Team Hub' },
    { href: `/events/${slug}/auction/public`, label: 'Public View' },
];

export function TeamLogo({ name, logoUrl, size = 28 }: { name: string; logoUrl: string | null; size?: number }) {
    if (logoUrl) {
        return <img src={logoUrl} alt="" width={size} height={size} className="rounded-full object-cover bg-secondary shrink-0" style={{ width: size, height: size }} />;
    }
    return (
        <span
            aria-hidden="true"
            className="rounded-full bg-secondary text-muted-foreground grid place-items-center font-semibold shrink-0"
            style={{ width: size, height: size, fontSize: size * 0.36 }}
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
    isLive = false,
    className = '',
    children,
}: {
    slug: string;
    kicker?: string;
    title: string;
    right?: ReactNode;
    /** A player is on the block: the Live link gets the pulsing dot. */
    isLive?: boolean;
    className?: string;
    children: ReactNode;
}) {
    const location = useLocation();

    // Matches the page's own dark background behind any unfilled viewport space.
    useEffect(() => {
        document.body.classList.add('pp-console-page');
        return () => document.body.classList.remove('pp-console-page');
    }, []);

    const here = location.pathname.replace(/\/$/, '');
    const active = (href: string) => here.endsWith(href.slice(href.indexOf('/auction/')));

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

            <main className={`auction-main ${className}`}>
                <nav className="auction-nav" aria-label="Auction pages">
                    {tabsFor(slug).map((t) => (
                        <Link key={t.href} to={t.href} className={active(t.href) ? 'active' : ''}>
                            {isLive && t.label === 'Live' && <span className="pp-live-dot" aria-label="Auction live" />}
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
