import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
    ArrowLeft,
    ArrowDownWideNarrow,
    Search,
    Users,
    CircleCheck,
    ChevronLeft,
    ChevronRight,
    SlidersHorizontal,
    RotateCcw,
} from 'lucide-react';
import { getHostPreview } from '../../api/adapters/events';
import './registration-identical.css';

const PAGE_SIZE = 10;

type SportFilter = 'all' | 'Padel' | 'Pickleball' | 'Both';
type LevelFilter = 'all' | 'Beginner' | 'Intermediate' | 'Advanced' | 'Pro';
type SortBy = 'recent' | 'name';

function FilterSelect({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: string;
    options: [string, string][];
    onChange: (value: string) => void;
}) {
    return (
        <div className="host-filter">
            <span className="host-filter-label">{label}</span>
            <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
                {options.map(([v, text]) => (
                    <option key={v} value={v}>
                        {text}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default function EventHostPreview() {
    const { slug } = useParams();
    const [q, setQ] = useState('');
    const [sport, setSport] = useState<SportFilter>('all');
    const [level, setLevel] = useState<LevelFilter>('all');
    const [sort, setSort] = useState<SortBy>('recent');
    const [page, setPage] = useState(1);

    const { data, isLoading } = useQuery({
        queryKey: ['host-preview', slug],
        queryFn: () => getHostPreview(slug!),
        enabled: !!slug,
    });

    const preview = data?.data;

    const results = useMemo(() => {
        if (!preview) return [];
        const needle = q.trim().toLowerCase();
        let rows = preview.players.filter((p) => {
            if (needle) {
                const haystack = `${p.name} ${p.email ?? ''} ${p.contact ?? ''} ${p.id}`.toLowerCase();
                if (!haystack.includes(needle)) return false;
            }
            if (sport !== 'all') {
                const both = p.sports.length > 1;
                if (sport === 'Both' && !both) return false;
                if (sport !== 'Both' && (both || !p.sports.includes(sport))) return false;
            }
            if (level !== 'all') {
                if (p.padelLevel !== level && p.pickleballLevel !== level) return false;
            }
            return true;
        });
        rows = [...rows].sort((a, b) =>
            sort === 'name'
                ? a.name.localeCompare(b.name)
                : new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime(),
        );
        return rows;
    }, [preview, q, sport, level, sort]);

    const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const shown = results.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
    const filtered = Boolean(q || sport !== 'all' || level !== 'all');
    const reset = () => {
        setQ('');
        setSport('all');
        setLevel('all');
        setPage(1);
    };

    if (isLoading) {
        return (
            <div className="ccreg flex min-h-screen items-center justify-center">
                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                    Loading…
                </p>
            </div>
        );
    }

    if (!preview) {
        return (
            <div className="ccreg flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
                <p className="text-base font-semibold">Not found</p>
                <Link to="/events" className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
                    Browse all events
                </Link>
            </div>
        );
    }

    const dates = preview.event.eventEndDate
        ? `${format(new Date(preview.event.eventDate), 'd MMM')} – ${format(new Date(preview.event.eventEndDate), 'd MMM yyyy')}`
        : format(new Date(preview.event.eventDate), 'd MMM yyyy');

    return (
        <div className="ccreg">
            <main className="hosts-main">
                <div className="host-topline">
                    <Link to={`/events/${slug}`} className="back-link" style={{ paddingLeft: 0 }}>
                        <ArrowLeft /> Event overview
                    </Link>
                    <span className="host-demo-tag">HOST PREVIEW · LIVE DATA</span>
                </div>

                <div className="host-heading">
                    <div>
                        <p className="section-kicker">{preview.event.title.toUpperCase()}</p>
                        <h1>REGISTERED PLAYERS</h1>
                    </div>
                    <span className="host-event-dates">
                        {dates} <span>{preview.event.venueName}</span>
                    </span>
                </div>

                <div className="host-metrics" aria-label="Registration summary">
                    <div>
                        <Users />
                        <span>
                            Total players
                            <strong>{preview.metrics.totalPlayers}</strong>
                        </span>
                    </div>
                    <div>
                        <CircleCheck />
                        <span>
                            Fees paid
                            <strong>
                                {preview.metrics.totalPlayers} <small>of {preview.metrics.totalPlayers} players</small>
                            </strong>
                        </span>
                    </div>
                    <div>
                        <span className="host-metric-icon">₹</span>
                        <span>
                            Collected
                            <strong>₹{preview.metrics.collectedInr.toLocaleString('en-IN')}</strong>
                        </span>
                    </div>
                </div>

                <section className="host-list" aria-label="Registered player list">
                    <div className="host-list-heading">
                        <h2>
                            Players <span>{preview.players.length}</span>
                        </h2>
                        <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                            Only paid players are registered
                        </span>
                    </div>
                    <div className="host-toolbar">
                        <div className="host-search">
                            <Search size={16} />
                            <input
                                aria-label="Search players"
                                placeholder="Search name, email, mobile or ID…"
                                value={q}
                                onChange={(e) => {
                                    setQ(e.target.value);
                                    setPage(1);
                                }}
                            />
                        </div>
                        <div className="host-sort">
                            <ArrowDownWideNarrow size={16} />
                            <FilterSelect
                                label="Sort by"
                                value={sort}
                                options={[
                                    ['recent', 'Newest first'],
                                    ['name', 'Name A–Z'],
                                ]}
                                onChange={(v) => setSort(v as SortBy)}
                            />
                        </div>
                    </div>
                    <div className="host-filters">
                        <SlidersHorizontal size={16} className="host-filter-icon" />
                        <FilterSelect
                            label="Sport"
                            value={sport}
                            options={[
                                ['all', 'All sports'],
                                ['Padel', 'Padel only'],
                                ['Pickleball', 'Pickleball only'],
                                ['Both', 'Both sports'],
                            ]}
                            onChange={(v) => {
                                setSport(v as SportFilter);
                                setPage(1);
                            }}
                        />
                        <FilterSelect
                            label="Playing level"
                            value={level}
                            options={[
                                ['all', 'All levels'],
                                ['Beginner', 'Beginner'],
                                ['Intermediate', 'Intermediate'],
                                ['Advanced', 'Advanced'],
                                ['Pro', 'Pro'],
                            ]}
                            onChange={(v) => {
                                setLevel(v as LevelFilter);
                                setPage(1);
                            }}
                        />
                        {filtered && (
                            <button onClick={reset} className="host-reset">
                                <RotateCcw size={14} /> Clear filters
                            </button>
                        )}
                        <span className="host-result-count" aria-live="polite">
                            {results.length} players
                        </span>
                    </div>
                    <div className="host-table-scroll" tabIndex={0} role="region" aria-label="Player table">
                        <table className="host-table">
                            <thead>
                                <tr>
                                    <th scope="col">Player</th>
                                    <th scope="col">Sport</th>
                                    <th scope="col">
                                        Playing level <span>(self-rated)</span>
                                    </th>
                                    <th scope="col">Interest</th>
                                    <th scope="col">Mobile</th>
                                    <th scope="col">Registered</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shown.map((p) => {
                                    const both = p.sports.length > 1;
                                    return (
                                        <tr key={p.id}>
                                            <td>
                                                <div className="host-player">
                                                    {p.photoUrl ? (
                                                        <img src={p.photoUrl} alt="" className="host-avatar-photo" />
                                                    ) : (
                                                        <span className="host-avatar" aria-hidden="true">
                                                            {p.name
                                                                .split(' ')
                                                                .map((n) => n[0])
                                                                .join('')}
                                                        </span>
                                                    )}
                                                    <div>
                                                        <strong>{p.name}</strong>
                                                        <span>{p.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`host-sport ${both ? 'host-sport-both' : ''}`}>
                                                    {both ? 'Both sports' : p.sports[0] || '—'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="host-levels">
                                                    {p.padelLevel && (
                                                        <span>
                                                            <small>PD</small> {p.padelLevel}
                                                        </span>
                                                    )}
                                                    {p.pickleballLevel && (
                                                        <span>
                                                            <small>PB</small> {p.pickleballLevel}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>{p.interest || '—'}</td>
                                            <td className="whitespace-nowrap">
                                                {p.contact ? <a href={`tel:${p.contact}`}>{p.contact}</a> : '—'}
                                            </td>
                                            <td className="host-registered">
                                                {format(new Date(p.registeredAt), 'd MMM')}
                                                <small>{format(new Date(p.registeredAt), 'yyyy')}</small>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {shown.length === 0 && (
                            <div className="host-empty">
                                <Search />
                                <h3>No players found</h3>
                                <button onClick={reset} style={{ color: 'var(--primary)' }}>
                                    Clear filters
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="host-pagination">
                        <span aria-live="polite">
                            {results.length
                                ? `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, results.length)} of ${results.length} players`
                                : '0 players'}
                        </span>
                        <div>
                            <button aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage((p) => p - 1)}>
                                <ChevronLeft size={14} />
                            </button>
                            <span>
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                aria-label="Next page"
                                disabled={currentPage === totalPages}
                                onClick={() => setPage((p) => p + 1)}
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                </section>

                <footer className="site-footer">
                    <span>Copyright PlayPass</span>
                    <span>Host preview · {preview.event.title}</span>
                </footer>
            </main>
        </div>
    );
}
