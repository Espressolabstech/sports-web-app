// Siloed mock data for the Private Club prototype.
// No backend, no shared dependencies — everything lives here.

export type SportId =
    | 'tennis'
    | 'football'
    | 'badminton'
    | 'table-tennis'
    | 'squash'
    | 'rifle'
    | 'box-cricket';

export interface ClubSport {
    id: SportId;
    name: string;
    /** Lucide icon name OR emoji fallback (we use lucide in the component) */
    unit: string; // "courts" | "pitches" | "tables" | "lanes" | "arena"
    count: number;
    basePeakCr: number;
    baseOffPeakCr: number;
    customHours?: { open: string; close: string };
    blurb: string;
}

export interface ClubMember {
    name: string;
    memberId: string;
    monthlyAllotment: number;
    used: number;
    renewalDate: string; // human-friendly
    phoneMasked: string;
}

export const club = {
    slug: 'regent',
    name: 'Karnavati Club',
    tagline: 'Member only sport booking system',
    /** Brand color chosen during onboarding. HSL triplet (no hsl() wrapper). */
    themeColor: '12 76% 45%',
    hero: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=1600&h=900&fit=crop',
    defaultHours: { open: '06:00', close: '23:00' },
    about: 'A members-only sporting club in the heart of the city. Six decades of racquet, field and range traditions — quietly maintained, exquisitely kept.',
    amenities: [
        "Members' Lounge",
        'Pro Shop',
        'Steam & Sauna',
        'Physio Room',
        'Café & Bar',
        'Valet Parking',
    ],
    contact: {
        address: '12 Royal Crescent, Civil Lines',
        phone: '+91 11 2345 6789',
        email: 'concierge@regentclub.in',
    },
    todayNotes: [
        { time: '14:00–16:00', text: 'Pool maintenance' },
        { time: 'All day', text: 'Coach Ravi available for Tennis' },
        { time: '19:30', text: "Members' mixer · Lounge" },
    ],
};

export const sports: ClubSport[] = [
    {
        id: 'tennis',
        name: 'Tennis',
        unit: 'courts',
        count: 4,
        baseOffPeakCr: 80,
        basePeakCr: 120,
        blurb: 'Two clay, two hard. Floodlit.',
    },
    {
        id: 'football',
        name: 'Football',
        unit: 'pitches',
        count: 2,
        baseOffPeakCr: 200,
        basePeakCr: 280,
        blurb: '5-a-side and 7-a-side.',
    },
    {
        id: 'badminton',
        name: 'Badminton',
        unit: 'courts',
        count: 6,
        baseOffPeakCr: 60,
        basePeakCr: 90,
        blurb: 'Wooden floor, BWF spec.',
    },
    {
        id: 'table-tennis',
        name: 'Table Tennis',
        unit: 'tables',
        count: 8,
        baseOffPeakCr: 30,
        basePeakCr: 45,
        blurb: 'Stiga competition tables.',
    },
    {
        id: 'squash',
        name: 'Squash',
        unit: 'courts',
        count: 5,
        baseOffPeakCr: 50,
        basePeakCr: 75,
        blurb: 'Glass-back championship court.',
    },
    {
        id: 'rifle',
        name: 'Rifle Shooting',
        unit: 'lanes',
        count: 4,
        baseOffPeakCr: 120,
        basePeakCr: 160,
        customHours: { open: '09:00', close: '20:00' },
        blurb: '10m air rifle, supervised.',
    },
    {
        id: 'box-cricket',
        name: 'Box Cricket',
        unit: 'arena',
        count: 1,
        baseOffPeakCr: 400,
        basePeakCr: 550,
        customHours: { open: '06:00', close: '22:00' },
        blurb: 'Astro turf, netted enclosure.',
    },
];

export const member: ClubMember = {
    name: 'Arjun Mehta',
    memberId: 'A-2014',
    monthlyAllotment: 5000,
    used: 500,
    renewalDate: '1st of next month',
    phoneMasked: '+91 ••••• •4521',
};

export function getSport(id: string): ClubSport | undefined {
    return sports.find((s) => s.id === id);
}

export interface ClubSlot {
    id: string;
    courtId: string;
    courtName: string;
    date: string;
    startTime: string;
    endTime: string;
    credits: number;
    isPeak: boolean;
    status: 'available' | 'booked';
}

const PEAK_START = 17; // 17:00
const PEAK_END = 22; // 22:00

function hourFromHHMM(t: string) {
    return parseInt(t.split(':')[0], 10);
}

// Deterministic pseudo-random so slots don't reshuffle on re-render
function seeded(seed: string) {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) {
        h ^= seed.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return () => {
        h += 0x6d2b79f5;
        let t = h;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function generateClubSlots(
    sportId: SportId,
    courtIndex: number,
    date: string,
): ClubSlot[] {
    const sport = getSport(sportId);
    if (!sport) return [];
    const hours = sport.customHours ?? club.defaultHours;
    const startH = hourFromHHMM(hours.open);
    const endH = hourFromHHMM(hours.close);
    const courtId = `${sportId}-${courtIndex}`;
    const courtName = courtLabel(sport, courtIndex);
    const rand = seeded(`${courtId}-${date}`);
    const slots: ClubSlot[] = [];
    for (let h = startH; h < endH; h++) {
        for (const m of [0, 30]) {
            const startMin = m;
            const endMin = m === 0 ? 30 : 0;
            const endH2 = m === 0 ? h : h + 1;
            const start = `${h.toString().padStart(2, '0')}:${startMin
                .toString()
                .padStart(2, '0')}`;
            const end = `${endH2.toString().padStart(2, '0')}:${endMin
                .toString()
                .padStart(2, '0')}`;
            const isPeak = h >= PEAK_START && h < PEAK_END;
            const credits = isPeak ? sport.basePeakCr : sport.baseOffPeakCr;
            const status: ClubSlot['status'] =
                rand() < 0.18 ? 'booked' : 'available';
            slots.push({
                id: `${courtId}-${date}-${start}`,
                courtId,
                courtName,
                date,
                startTime: start,
                endTime: end,
                credits,
                isPeak,
                status,
            });
        }
    }
    return slots;
}

export function courtLabel(sport: ClubSport, idx: number) {
    const single =
        sport.unit === 'tables'
            ? 'Table'
            : sport.unit === 'pitches'
              ? 'Pitch'
              : sport.unit === 'lanes'
                ? 'Lane'
                : sport.unit === 'arena'
                  ? 'Arena'
                  : 'Court';
    return sport.unit === 'arena' ? 'Main Arena' : `${single} ${idx + 1}`;
}

export function listCourts(sport: ClubSport) {
    return Array.from({ length: sport.count }, (_, i) => ({
        index: i,
        id: `${sport.id}-${i}`,
        name: courtLabel(sport, i),
    }));
}

export function nextDays(
    n: number,
): { date: string; label: string; sub: string }[] {
    const out: { date: string; label: string; sub: string }[] = [];
    const today = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 0; i < n; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const date = d.toISOString().split('T')[0];
        out.push({
            date,
            label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : days[d.getDay()],
            sub: `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })}`,
        });
    }
    return out;
}
