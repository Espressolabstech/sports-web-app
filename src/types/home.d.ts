declare global {
    interface SportChipsProps {
        selected: string;
        onSelect: (sport: string) => void;
    }

    interface FacilityCardProps {
        facility: ApiVenue;
        selectedSport?: string;
    }
}

export {};
