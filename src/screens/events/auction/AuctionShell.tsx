import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useEffect, type ReactNode } from 'react';
import { initials } from '../../../lib/auction';
import playpassLogo from '../../../assets/logo-white-v2-cropped.png';
import courtCollectiveLogo from '../../../assets/court-collective-lockup-white.png';
import '../registration-identical.css';
import '../../../components/pp-ui';
import { AuctionScreenFit } from './AuctionScreenFit';
import { VariantImg } from '../../../components/VariantImg';

// The public pages. The organizer console lives in the organizer app and the
// auction admin in the admin dashboard.
const tabsFor = (slug: string): { href: string; label: string }[] => [
    { href: `/events/${slug}/auction/team`, label: 'Live Auction' },
    { href: `/events/${slug}/auction/squads`, label: 'Squads' },
];

export function TeamLogo({ name, logoUrl, size = 28 }: { name: string; logoUrl: string | null; size?: number }) {
    if (logoUrl) {
        return <VariantImg src={logoUrl} size="thumb" alt="" width={size} height={size} className="rounded-full object-cover bg-secondary shrink-0" style={{ width: size, height: size }} />;
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
    title,
    right,
    isLive = false,
    nav = true,
    footer = 'Auction · The Court Collective 2026',
    className = '',
    children,
}: {
    slug: string;
    /** Kept for callers; the page title now sits in the brand header under "THE COURT COLLECTIVE 2026". */
    kicker?: string;
    title: string;
    right?: ReactNode;
    /** A player is on the block: the Live link gets the pulsing dot. */
    isLive?: boolean;
    /** The Live Auction / Squads tabs. Off for the standalone Squads link. */
    nav?: boolean;
    /** Right side of the footer. */
    footer?: string;
    className?: string;
    children: ReactNode;
}) {
    const location = useLocation();
    // Big-screen mode for the LED wall / projector: add ?screen=1 to the link.
    const [params] = useSearchParams();
    const screen = params.get('screen') === '1';

    // Matches the page's own dark background behind any unfilled viewport space.
    useEffect(() => {
        document.body.classList.add('pp-console-page');
        return () => document.body.classList.remove('pp-console-page');
    }, []);

    const here = location.pathname.replace(/\/$/, '');
    const active = (href: string) => here.endsWith(href.slice(href.indexOf('/auction/')));

    const brandHeader = (
        <header className="site-header-like auction-brand-header">
            <div className="auction-brand-identity">
                <Link to="/the-court-collective" className="wordmark" aria-label="The Court Collective — home">
                    <img src={courtCollectiveLogo} alt="The Court Collective" className="brand-logo brand-logo-lockup" width={159} height={64} />
                </Link>
                {title && (
                    <div className="auction-brand-title">
                        <p className="section-kicker">THE COURT COLLECTIVE 2026</p>
                        <h1>{title}</h1>
                    </div>
                )}
            </div>
            <div className="header-right">
                {right}
                <span className="powered-by">
                    <span className="powered-by-label">Tech Partner</span>
                    <img src={playpassLogo} alt="PlayPass" className="playpass-logo" />
                </span>
            </div>
        </header>
    );

    // Big screen: no page tabs or footer, and the whole page scaled to fill the screen.
    if (screen) {
        return (
            <div className="ccreg pp-console is-screen">
                <AuctionScreenFit>
                    <main className={`auction-main ${className}`}>
                        {brandHeader}
                        {children}
                    </main>
                </AuctionScreenFit>
            </div>
        );
    }

    return (
        <div className="ccreg pp-console">
            <main className={`auction-main ${className}`}>
                {nav && (
                    <nav className="auction-nav" aria-label="Auction pages">
                        {tabsFor(slug).map((t) => (
                            <Link key={t.href} to={t.href} className={active(t.href) ? 'active' : ''}>
                                {isLive && t.label === 'Live Auction' && <span className="pp-live-dot" aria-label="Auction live" />}
                                {t.label}
                            </Link>
                        ))}
                    </nav>
                )}

                {brandHeader}

                {children}

                <footer className="site-footer">
                    <span>Copyright PlayPass</span>
                    <span>{footer}</span>
                </footer>
            </main>
        </div>
    );
}
