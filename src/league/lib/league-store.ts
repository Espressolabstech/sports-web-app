/**
 * The reference's demo store API (src/lib/league-store.ts), backed by the server instead of localStorage.
 * Screens keep calling the same functions; the server owns logins, line-ups, locks, secrecy and the change log.
 * The page sets the latest server view with setLeagueView(); every action calls the API, then refetches.
 */
import { useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import { emptyLineup, isComplete, type AutoFillSource, type Lineup } from '@league/lib/lineup-rules';
import { squadFor } from '@league/lib/league-squads';
import { defaultPart1, roundOf, ROUND_ORDER, teamCode, type RoundKey, type Tie } from '@league/lib/tournament';
import type { LeagueView } from '@league/lib/server-types';

export type TeamLogin = { name?: string; mobile: string };
/** myLock: an admin override for the signed-in team only (team view). */
export type TieMeta = { part1?: 'Pickleball' | 'Padel'; lockedAt?: string; myLock?: 'locked' | 'unlocked' };
export type LineupRec = { spots: Lineup; updatedAt: string; autoFilled?: AutoFillSource; changedAfterLock?: boolean; replacedSpots?: string[]; confirmedAt?: string };
export type LogEntry = { at: string; tie: number; slot: number; who: string; what: string[]; warnings: string[]; kind?: 'edit' | 'replacement' | 'auto' };
export type Session = { role: 'organiser' | 'team'; mobile: string; slot?: number };
export type PlayerProfile = { photo?: string; mobile?: string };
export type LeagueState = {
    v: 1;
    roundLocks: Partial<Record<RoundKey, string>>;
    tournamentDemo?: undefined;
    logins: Record<number, TeamLogin>;
    ties: Record<number, TieMeta>;
    lineups: Record<string, LineupRec>; // `${tie}:${slot}`
    log: LogEntry[];
    profiles?: Record<string, PlayerProfile>;
    session: Session | null;
    organiser: string | null;
};

// ───────────── Connection to the app (set by the page) ─────────────

type Request = (method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown) => Promise<unknown>;
type Config = { mode: 'host' | 'team' | 'public'; request: Request; refetch: () => Promise<unknown>; signOut?: () => void };
let config: Config | null = null;
export const configureLeague = (c: Config) => {
    config = c;
};

let view: LeagueView | null = null;
let state: LeagueState = derive(null);
// Local edits to team login fields (saved with the Save button), and just-saved ones until the refresh arrives.
let loginDrafts: Record<number, TeamLogin> = {};
let savedLogins: Record<number, TeamLogin> = {};
const subs = new Set<() => void>();
const emit = () => {
    for (const f of subs) f();
};

export function setLeagueView(v: LeagueView | null) {
    view = v;
    state = derive(v);
    emit();
}
export const getLeagueView = () => view;

const stamp = (...parts: unknown[]) => parts.map((p) => (p == null ? '' : typeof p === 'string' ? p : JSON.stringify(p))).join('|');

function derive(v: LeagueView | null): LeagueState {
    const s: LeagueState = { v: 1, roundLocks: {}, logins: {}, ties: {}, lineups: {}, log: [], profiles: {}, session: null, organiser: null };
    if (!v) return s;
    for (const r of v.rounds ?? []) if (r.lockAt) s.roundLocks[(r.key === 'SF' || r.key === 'F' ? r.key : Number(r.key)) as RoundKey] = r.lockAt;
    for (const t of v.teams ?? []) if (t.user) s.logins[t.slot] = { name: t.user.name, mobile: t.user.phone };
    for (const [slot, d] of Object.entries({ ...savedLogins, ...loginDrafts })) s.logins[Number(slot)] = d;
    for (const t of v.ties ?? []) {
        s.ties[t.number] = { part1: t.part1 as 'Pickleball' | 'Padel', ...(t.lockedAt ? { lockedAt: t.lockedAt } : {}), ...(t.myLock ? { myLock: t.myLock } : {}) };
        for (const [slot, rec] of [
            [t.slotA, t.lineupA],
            [t.slotB, t.lineupB],
        ] as const) {
            if (slot == null || !rec) continue;
            const auto = rec.autoFillSource && rec.autoFillSource !== 'confirmed' ? (rec.autoFillSource as AutoFillSource) : undefined;
            s.lineups[lkey(t.number, slot)] = {
                spots: { ...emptyLineup(), ...rec.spots },
                updatedAt: stamp(rec.spots, rec.confirmedAt, rec.changedAfterLock, rec.replacedSpots, t.lockedAt),
                ...(auto ? { autoFilled: auto } : {}),
                changedAfterLock: rec.changedAfterLock,
                replacedSpots: rec.replacedSpots ?? [],
                ...(rec.confirmedAt ? { confirmedAt: rec.confirmedAt } : {}),
            };
        }
    }
    for (const players of Object.values(v.squads ?? {})) {
        for (const p of players) s.profiles![p.id] = { ...(p.photoUrl ? { photo: p.photoUrl } : {}), ...(p.phone ? { mobile: p.phone } : {}) };
    }
    if (v.viewer === 'team' && v.mySlot) s.session = { role: 'team', mobile: '', slot: v.mySlot };
    if (v.viewer === 'host') s.organiser = 'host';
    return s;
}

const SERVER = derive(null);
export function useLeague(): LeagueState {
    return useSyncExternalStore(
        (f) => {
            subs.add(f);
            return () => subs.delete(f);
        },
        () => state,
        () => SERVER,
    );
}
export const getLeague = () => state;

// ───────────── Derived helpers (as in the reference) ─────────────
export const lkey = (tie: number, slot: number) => `${tie}:${slot}`;
export const part1Of = (s: LeagueState, tieId: number) => s.ties[tieId]?.part1 ?? defaultPart1(tieId);
export const lockAt = (s: LeagueState, t: Tie) => new Date(s.roundLocks?.[roundOf(t.id)] ?? '');
/**
 * Locked once the server locked it, or the deadline passed (the lock job follows within a minute). In the team view an
 * admin override for this team wins: 'unlocked' reopens it after the deadline, 'locked' closes it early.
 */
export const isLocked = (s: LeagueState, t: Tie, now = Date.now()) => {
    const own = s.ties[t.id]?.myLock;
    if (own) return own === 'locked';
    return !!s.ties[t.id]?.lockedAt || now >= lockAt(s, t).getTime();
};
/** The team's line-up was reopened by the organisers after its deadline. */
export const reopened = (s: LeagueState, t: Tie, now = Date.now()) => s.ties[t.id]?.myLock === 'unlocked' && (!!s.ties[t.id]?.lockedAt || now >= lockAt(s, t).getTime());
export const isOpen = (t: Tie) => t.slot_a != null && t.slot_b != null;
export const lineupOf = (s: LeagueState, tie: number, slot: number) => s.lineups[lkey(tie, slot)];
export const canViewLineups = (s: LeagueState, t: Tie, _now = Date.now()) => t.slot_a != null && t.slot_b != null && !!s.ties[t.id]?.lockedAt;
export const sideOf = (t: Tie, slot: number) => (t.slot_a === slot ? 'a' : t.slot_b === slot ? 'b' : null);
export const opponentOf = (t: Tie, slot: number) => (t.slot_a === slot ? t.slot_b : t.slot_a);
const tieOrder = (t: Tie) => ROUND_ORDER.indexOf(roundOf(t.id)) * 100 + t.id;
export const teamTies = (ties: Tie[], slot: number) => ties.filter((t) => t.slot_a === slot || t.slot_b === slot).sort((a, b) => tieOrder(a) - tieOrder(b));
export function previousTie(ties: Tie[], tie: Tie, slot: number) {
    const list = teamTies(ties, slot);
    const i = list.findIndex((t) => t.id === tie.id);
    return i > 0 ? list[i - 1] : undefined;
}
export function autoFillSlots(s: LeagueState, ties: Tie[], now = Date.now()) {
    return [
        ...new Set(
            ties
                .filter((t) => isOpen(t) && !isLocked(s, t, now))
                .flatMap((t) => [t.slot_a, t.slot_b].filter((slot): slot is number => slot != null && !lineupOf(s, t.id, slot)?.confirmedAt)),
        ),
    ];
}
export const isCompleteFor = (spots: Lineup, slot: number) => isComplete(spots, squadFor(teamCode(slot)));

// ───────────── Actions → server ─────────────
const host = (path: string) => `/host/events/:slug/league${path}`;
async function run(label: string, fn: () => Promise<unknown>, success?: string) {
    if (!config) throw new Error('League is not connected');
    try {
        const out = await fn();
        await config.refetch();
        if (success) toast.success(success);
        return out;
    } catch (e) {
        toast.error((e as { message?: string }).message || `Could not ${label}`);
        await config.refetch().catch(() => undefined);
        throw e;
    }
}
const req: Request = (m, p, b) => config!.request(m, p, b);

export const login = (_session: Session) => undefined;
export const logout = () => config?.signOut?.();
export const loginOrganiser = (_mobile: string) => undefined;
export const logoutOrganiser = () => config?.signOut?.();

/** Team login fields: edited on screen, saved together with the Team access "Save" button. */
export const setLogin = (slot: number, l: TeamLogin) => {
    loginDrafts = { ...loginDrafts, [slot]: l };
    state = derive(view);
    emit();
};
/** Teams whose login was edited and not saved yet. */
export const unsavedLogins = () => Object.keys(loginDrafts).length;
/** Saves every edited team login at once. Each needs a name and a 10-digit mobile (or both cleared to remove it). */
export async function saveLogins() {
    const names = new Map((view?.teams ?? []).map((t) => [t.slot, t.name]));
    const edits = Object.entries(loginDrafts).map(([slot, l]) => ({ slot: Number(slot), name: (l.name ?? '').trim(), mobile: l.mobile.trim() }));
    const invalid = edits.filter((e) => !(e.name === '' && e.mobile === '') && (!e.name || !/^\d{10}$/.test(e.mobile)));
    if (invalid.length) {
        toast.error(`Enter a name and a 10-digit mobile for: ${invalid.map((e) => names.get(e.slot) ?? `Team ${e.slot}`).join(', ')}`);
        return false;
    }
    if (!config) return false;
    try {
        // One request for every edited team (one write on the server).
        await req('PUT', host('/teams/users'), { users: edits.map((e) => ({ slot: e.slot, name: e.name, phone: e.mobile })) });
        // Saved: done at once. The typed values stay on screen until the refreshed league arrives (no flicker).
        savedLogins = { ...savedLogins, ...loginDrafts };
        loginDrafts = {};
        void config.refetch().finally(() => {
            savedLogins = {};
            state = derive(view);
            emit();
        });
        toast.success(edits.length === 1 ? 'Team login saved' : `${edits.length} team logins saved`);
        return true;
    } catch (e) {
        toast.error((e as { message?: string }).message || 'Could not save the team logins');
        await config.refetch().catch(() => undefined);
        return false;
    } finally {
        state = derive(view);
        emit();
    }
}

/** Groups (draw slots) — first save sets the league up; later saves reset the flow (confirmed by the screen). */
export function saveDemoGroups(groups: Record<string, number>, reset: boolean) {
    const teams = Object.entries(groups).map(([auctionTeamId, slot]) => ({ auctionTeamId, slot }));
    return run('save the groups', () => (reset ? req('PUT', host('/draw'), { teams, confirm: true }) : req('POST', host('/setup'), { teams })));
}
export function saveDemoPair(id: number, a: number, b: number) {
    return run('save the matchup', () => req('PUT', host(`/ties/${id}/pairing`), { slotA: a, slotB: b, confirm: true }));
}
export const setRoundLock = (round: RoundKey, deadline: string) => {
    if (!Number.isFinite(Date.parse(deadline))) return Promise.resolve();
    return run('save the lock-in', () => req('PUT', host(`/rounds/${round}`), { lockAt: new Date(deadline).toISOString(), confirm: true })).then(() => undefined);
};
export const resetDemo = () => undefined;
export const testingRoundsLocked = (_ties: Tie[], n = 1) => run('apply the testing state', () => req('POST', host('/testing'), { preset: `l${n}` }));

/** Team confirm (before the lock only — the server checks again). */
export const saveTeamLineup = (tie: number, _slot: number, spots: Lineup) =>
    run('confirm the squad', () => req('PUT', `/public/events/:slug/league/team/ties/${tie}/lineup`, { spots }), 'Squad confirmed').then(() => undefined, () => undefined);

/** Organiser edit, logged on the server. After the lock it is flagged "changed after lock". */
export function organiserSave(t: Tie, slot: number, spots: Lineup, _warnings: string[]) {
    return run('save the line-up', () => req('PUT', host(`/ties/${t.id}/lineups/${slot}`), { spots }), 'Line-up saved').then(() => undefined, () => undefined);
}
/** Organiser injury replacement on a locked line-up (rulebook §7), logged as a replacement. */
export function replacePlayer(t: Tie, slot: number, spotId: string, incoming: string) {
    void run('replace the player', () => req('POST', host(`/ties/${t.id}/lineups/${slot}/replace`), { spotId, playerId: incoming }), 'Replacement saved').catch(() => undefined);
}

/** The server's lock job locks ties; screens refetch once a deadline passes so the lock shows promptly. */
let lastTick = 0;
export function tickLocks(ties: Tie[]) {
    const now = Date.now();
    if (now - lastTick < 15_000) return;
    const due = ties.some((t) => isOpen(t) && !state.ties[t.id]?.lockedAt && now >= lockAt(state, t).getTime());
    if (due) {
        lastTick = now;
        void config?.refetch();
    }
}
