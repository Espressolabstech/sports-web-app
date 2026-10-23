import { useEffect, useMemo, useState } from 'react';
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
    LockKeyhole,
    Download,
} from 'lucide-react';
import { getHostPreview, hostPreviewLogin } from '../../api/adapters/events';
import { verifyOtp } from '../../api/adapters/auth';
import './registration-identical.css';

/** Parses a YYYY-MM-DD string as a local calendar date — never via
 *  `new Date(ymd)`, which parses date-only strings as UTC midnight and can
 *  display as the wrong day once formatted in local time. */
function parseLocalISODate(ymd: string): Date {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, m - 1, d);
}

/** Separate from the app's own __token cookie on purpose — this is a
 * one-event-scoped viewer login, not a player/organizer session, and must
 * never overwrite or be overwritten by one on a shared device. */
const tokenKeyFor = (slug: string) => `host-preview-token:${slug}`;

const PAGE_SIZE = 10;

function paymentLabel(method: string | null): string {
    if (method?.endsWith('_REFUNDED') || method === 'REFUNDED') return 'Refunded';
    if (method === 'MANUAL_QR') return 'Manual (QR)';
    return 'Online';
}

function csvCell(value: unknown): string {
    let s = value == null ? '' : String(value);
    // Stops spreadsheet apps from running player-entered text as a formula.
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadPlayersCsv(players: ApiHostPreviewPlayer[], fileName: string) {
    const columns: [string, (p: ApiHostPreviewPlayer) => unknown][] = [
        ['Name', (p) => p.name],
        ['Mobile', (p) => p.contact],
        ['Email', (p) => p.email],
        ['Gender', (p) => p.gender],
        ['Age', (p) => p.age],
        ['City', (p) => p.city],
        ['Sports', (p) => p.sports.join(', ')],
        ['Padel level', (p) => p.padelLevel],
        ['Pickleball level', (p) => p.pickleballLevel],
        ['Day availability', (p) => p.dayAvailability.map((d) => format(parseLocalISODate(d), 'd MMM yyyy')).join(', ')],
        ['Interest', (p) => p.interest],
        ['Jersey size', (p) => p.jersey],
        ['Instagram', (p) => p.instagram],
        ['Achievements', (p) => p.achievements],
        ['Video link', (p) => p.videoLink],
        ['Photo', (p) => p.photoUrl],
        ['Payment method', (p) => (p.paymentMethod?.startsWith('MANUAL_QR') ? 'Manual (QR)' : 'Online')],
        ['Payment status', (p) => (paymentLabel(p.paymentMethod) === 'Refunded' ? 'Refunded' : 'Paid')],
        ['UPI reference', (p) => p.paymentUpiRef],
        ['Payment proof', (p) => p.paymentProofUrl],
        ['Registered at', (p) => format(new Date(p.registeredAt), 'd MMM yyyy, h:mm a')],
        ['Player ID', (p) => p.id],
    ];
    const lines = [
        columns.map(([header]) => csvCell(header)).join(','),
        ...players.map((p) => columns.map(([, get]) => csvCell(get(p))).join(',')),
    ];
    // BOM so Excel opens names/achievements with non-ASCII characters correctly.
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
}

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
    const [selectedPlayer, setSelectedPlayer] = useState<ApiHostPreviewPlayer | null>(null);

    const [token, setToken] = useState<string | null>(() => (slug ? localStorage.getItem(tokenKeyFor(slug)) : null));
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [authBusy, setAuthBusy] = useState(false);
    const [authError, setAuthError] = useState('');

    const logout = () => {
        if (slug) localStorage.removeItem(tokenKeyFor(slug));
        setToken(null);
        setOtpSent(false);
        setOtp('');
    };

    const sendOtp = async () => {
        if (!slug || !/^\d{10}$/.test(phone)) {
            setAuthError('Enter a valid 10-digit mobile number');
            return;
        }
        setAuthBusy(true);
        setAuthError('');
        try {
            await hostPreviewLogin(slug, phone);
            setOtpSent(true);
        } catch (err) {
            setAuthError(err instanceof Error ? err.message : 'Could not send OTP');
        } finally {
            setAuthBusy(false);
        }
    };

    const verify = async () => {
        if (!slug || otp.trim().length === 0) {
            setAuthError('Enter the OTP');
            return;
        }
        setAuthBusy(true);
        setAuthError('');
        try {
            const result = await verifyOtp({ phone, otp: otp.trim() });
            const newToken = result.data.token;
            localStorage.setItem(tokenKeyFor(slug), newToken);
            setToken(newToken);
        } catch (err) {
            setAuthError(err instanceof Error ? err.message : 'Invalid OTP');
        } finally {
            setAuthBusy(false);
        }
    };

    const { data, isLoading, error } = useQuery({
        queryKey: ['host-preview', slug, token],
        queryFn: () => getHostPreview(slug!, token!),
        enabled: !!slug && !!token,
        retry: false,
    });

    useEffect(() => {
        if (error) logout();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [error]);

    const preview = data?.data;
    const feesPaidCount = preview?.players.filter((p) => paymentLabel(p.paymentMethod) !== 'Refunded').length ?? 0;
    const refundedCount = (preview?.players.length ?? 0) - feesPaidCount;

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

    if (!token) {
        return (
            <div className="ccreg flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
                <LockKeyhole className="h-6 w-6" style={{ color: 'var(--primary)' }} />
                <div>
                    <h1 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
                        Host preview login
                    </h1>
                    <p className="mt-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        This number must already be added as a viewer for this event.
                    </p>
                </div>
                <div className="w-full max-w-[280px] space-y-3">
                    {!otpSent ? (
                        <>
                            <input
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                placeholder="Mobile number"
                                inputMode="numeric"
                                className="field-input-plain"
                            />
                            <button onClick={sendOtp} disabled={authBusy} className="continue-btn w-full justify-center">
                                {authBusy ? 'Sending…' : 'Send OTP'}
                            </button>
                        </>
                    ) : (
                        <>
                            <input
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="Enter OTP"
                                inputMode="numeric"
                                className="field-input-plain"
                            />
                            <button onClick={verify} disabled={authBusy} className="continue-btn w-full justify-center">
                                {authBusy ? 'Verifying…' : 'Verify & continue'}
                            </button>
                        </>
                    )}
                    {authError && (
                        <p className="text-xs" style={{ color: 'var(--destructive)' }}>
                            {authError}
                        </p>
                    )}
                </div>
            </div>
        );
    }

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
                            Registered players
                            <strong>{feesPaidCount}</strong>
                        </span>
                    </div>
                    <div>
                        <CircleCheck />
                        <span>
                            Total refunded
                            <strong>{refundedCount}</strong>
                        </span>
                    </div>
                    <div>
                        <span className="host-metric-icon">₹</span>
                        <span>
                            Collected
                            <strong>₹{(feesPaidCount * preview.event.priceInr).toLocaleString('en-IN')}</strong>
                        </span>
                    </div>
                </div>

                <section className="host-list" aria-label="Registered player list">
                    <div className="host-list-heading">
                        <h2>
                            Players <span>{preview.players.length}</span>
                        </h2>
                        <div className="host-list-actions">
                            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                                Only paid players are registered
                            </span>
                            <button
                                type="button"
                                className="host-export"
                                disabled={results.length === 0}
                                onClick={() =>
                                    downloadPlayersCsv(
                                        results,
                                        `${slug}-players-${format(new Date(), 'yyyy-MM-dd')}.csv`,
                                    )
                                }
                            >
                                <Download size={14} />
                                Export CSV{filtered ? ` (${results.length})` : ''}
                            </button>
                        </div>
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
                                    <th scope="col">Payment</th>
                                    <th scope="col">Registered</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shown.map((p) => {
                                    const both = p.sports.length > 1;
                                    return (
                                        <tr key={p.id} className="host-row-clickable" onClick={() => setSelectedPlayer(p)}>
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
                                                        <span>
                                                            {p.email}
                                                            {p.gender && ` · ${p.gender}`}
                                                        </span>
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
                                                {p.contact ? (
                                                    <a href={`tel:${p.contact}`} onClick={(e) => e.stopPropagation()}>
                                                        {p.contact}
                                                    </a>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                            <td>
                                                {p.paymentMethod?.startsWith('MANUAL_QR') ? (
                                                    <div className="host-manual-payment">
                                                        {p.paymentMethod.endsWith('_REFUNDED') ? (
                                                            <span className="host-payment-badge host-payment-badge-refunded">Refunded</span>
                                                        ) : (
                                                            <span className="host-payment-badge">Manual (QR)</span>
                                                        )}
                                                        {p.paymentProofUrl && (
                                                            <a
                                                                href={p.paymentProofUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                View proof
                                                            </a>
                                                        )}
                                                        {p.paymentUpiRef && <small>UPI: {p.paymentUpiRef}</small>}
                                                    </div>
                                                ) : p.paymentMethod?.endsWith('_REFUNDED') ? (
                                                    <span className="host-payment-badge host-payment-badge-refunded">Refunded</span>
                                                ) : (
                                                    <span className="host-payment-badge host-payment-badge-online">Online</span>
                                                )}
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

            {selectedPlayer && (
                <div className="host-detail-overlay" onClick={() => setSelectedPlayer(null)}>
                    <div className="host-detail-card" onClick={(e) => e.stopPropagation()}>
                        <button className="host-detail-close" onClick={() => setSelectedPlayer(null)} aria-label="Close">
                            ✕
                        </button>
                        <div className="host-detail-head">
                            {selectedPlayer.photoUrl ? (
                                <img src={selectedPlayer.photoUrl} alt="" className="host-avatar-photo" />
                            ) : (
                                <span className="host-avatar" aria-hidden="true">
                                    {selectedPlayer.name
                                        .split(' ')
                                        .map((n) => n[0])
                                        .join('')}
                                </span>
                            )}
                            <div>
                                <h2>{selectedPlayer.name}</h2>
                                <p>
                                    {[selectedPlayer.city, selectedPlayer.age && `${selectedPlayer.age} years`, selectedPlayer.gender]
                                        .filter(Boolean)
                                        .join(' · ') || '—'}
                                </p>
                            </div>
                        </div>
                        <dl className="host-detail-lines">
                            {(
                                [
                                    ['Email', selectedPlayer.email || '—'],
                                    ['Mobile', selectedPlayer.contact || '—'],
                                    ['Instagram', selectedPlayer.instagram || 'Not provided'],
                                    ['Sports', selectedPlayer.sports.join(' & ') || '—'],
                                    [
                                        'Playing levels',
                                        selectedPlayer.sports
                                            .map(
                                                (s) =>
                                                    `${s}: ${s === 'Padel' ? selectedPlayer.padelLevel : selectedPlayer.pickleballLevel}`,
                                            )
                                            .join(' / ') || '—',
                                    ],
                                    ['Jersey size', selectedPlayer.jersey || '—'],
                                    [
                                        'Availability',
                                        selectedPlayer.dayAvailability.length
                                            ? selectedPlayer.dayAvailability.map((d) => format(parseLocalISODate(d), 'd MMM')).join(', ')
                                            : '—',
                                    ],
                                    ['League interest', selectedPlayer.interest || '—'],
                                    ['Achievements', selectedPlayer.achievements || 'Not provided'],
                                    ['Playing video', selectedPlayer.videoLink || 'Not provided'],
                                    [
                                        'Registered',
                                        format(new Date(selectedPlayer.registeredAt), 'd MMM yyyy'),
                                    ],
                                ] as [string, string][]
                            ).map(([title, value]) => (
                                <div key={title}>
                                    <dt>{title}</dt>
                                    <dd>{value}</dd>
                                </div>
                            ))}
                        </dl>
                        <div className="host-detail-payment">
                            {selectedPlayer.paymentMethod?.startsWith('MANUAL_QR') ? (
                                <>
                                    {selectedPlayer.paymentMethod.endsWith('_REFUNDED') ? (
                                        <span className="host-payment-badge host-payment-badge-refunded">Refunded</span>
                                    ) : (
                                        <span className="host-payment-badge">Manual (QR)</span>
                                    )}
                                    {selectedPlayer.paymentProofUrl && (
                                        <a href={selectedPlayer.paymentProofUrl} target="_blank" rel="noreferrer">
                                            View proof
                                        </a>
                                    )}
                                    {selectedPlayer.paymentUpiRef && <small>UPI: {selectedPlayer.paymentUpiRef}</small>}
                                </>
                            ) : selectedPlayer.paymentMethod?.endsWith('_REFUNDED') ? (
                                <span className="host-payment-badge host-payment-badge-refunded">Refunded</span>
                            ) : (
                                <span className="host-payment-badge host-payment-badge-online">Online</span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
