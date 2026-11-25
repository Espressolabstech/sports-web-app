import type { ReactNode } from 'react';
import brandLogo from '@app-assets/court-collective-lockup-white.png';
import playpassLogo from '@app-assets/logo-white-v2-cropped.png';

export function SiteHeader({ title, right, afterLogo }: { title?: string; right?: ReactNode; afterLogo?: ReactNode }) {
  return <header className={`site-header${title ? ' auction-brand-header' : ''}${afterLogo ? ' has-logo-action' : ''}`}>
    <div className="auction-brand-identity"><a href="/the-court-collective" className="wordmark" aria-label="The Court Collective — home"><img src={brandLogo} alt="The Court Collective" className="brand-logo brand-logo-lockup" width={159} height={64} loading="eager" /></a>
      {title && <div className="auction-brand-title"><p className="section-kicker">THE COURT COLLECTIVE 2026</p><h1>{title}</h1></div>}
    </div>
    <div className="header-right">{right}<span className="powered-by"><span className="powered-by-label">Tech Partner</span><img src={playpassLogo} alt="PlayPass" className="playpass-logo" width={110} height={26} /></span>{afterLogo}</div>
  </header>;
}
