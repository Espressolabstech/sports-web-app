/** Minimal TanStack Router stand-ins on react-router, for the copied reference screens. */
import { Link as RRLink, useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { leagueLinks } from '@league/lib/links';

type Search = Record<string, string | number | undefined>;
const qs = (search?: Search) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(search ?? {})) if (v !== undefined) p.set(k, String(v));
    const s = p.toString();
    return s ? `?${s}` : '';
};

/** `to` is a reference route ('/scoring', '/team', '/results'); it maps to this app's league URLs. */
export function Link({ to, search, children, className, activeProps }: { to: string; search?: Search; children: ReactNode; className?: string; activeProps?: { className?: string } }) {
    const { pathname } = useLocation();
    const href = leagueLinks.resolve(to);
    const active = pathname === href.split('?')[0];
    const external = /^https?:/.test(href);
    const cls = [className, active ? activeProps?.className : ''].filter(Boolean).join(' ') || undefined;
    return external ? (
        <a href={href + qs(search)} className={cls}>
            {children}
        </a>
    ) : (
        <RRLink to={href + qs(search)} className={cls}>
            {children}
        </RRLink>
    );
}

export function useRouter() {
    const navigate = useNavigate();
    return { invalidate: async () => undefined, navigate };
}
