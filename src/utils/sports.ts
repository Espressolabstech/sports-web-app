export const SPORT_DISPLAY: Record<string, string> = {
    PADEL: 'Padel',
    PICKELBALL: 'Pickleball',
    PICKLEBALL: 'Pickleball',
    TENNIS: 'Tennis',
    BADMINTON: 'Badminton',
    TABLE_TENNIS: 'Table Tennis',
    SQUASH: 'Squash',
    FOOTBALL: 'Football',
    CRICKET: 'Cricket',
    BOX_CRICKET: 'Box Cricket',
    BASKETBALL: 'Basketball',
    VOLLEYBALL: 'Volleyball',
    SWIMMING: 'Swimming',
    HOCKEY: 'Hockey',
    GOLF: 'Golf',
    CYCLING: 'Cycling',
    YOGA: 'Yoga',
    GYM: 'Gym',
    RIFLE_SHOOTING: 'Rifle Shooting',
    ARCHERY: 'Archery',
    BOXING: 'Boxing',
    SNOOKER: 'Snooker',
};

export function getSportLabel(sport: string): string {
    return SPORT_DISPLAY[sport] ?? sport;
}
