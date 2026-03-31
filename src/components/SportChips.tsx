import { cn } from '../utils/twMerge';

const sports = [
    { label: 'All', icon: '🏟️' },
    { label: 'Padel', icon: '🎾' },
    { label: 'Pickleball', icon: '🏓' },
];

export function SportChips({ selected, onSelect }: SportChipsProps) {
    return (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {sports.map((sport) => (
                <button
                    key={sport.label}
                    onClick={() => onSelect(sport.label)}
                    className={cn(
                        'flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors',
                        selected === sport.label
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'bg-card text-muted-foreground border',
                    )}
                >
                    <span>{sport.icon}</span>
                    <span>{sport.label}</span>
                </button>
            ))}
        </div>
    );
}
