import { Images } from '../resources/images';
import { cn } from '../utils/twMerge';

const sports = [
    { label: 'All', value: 'All', emoji: '🏟️', svgIcon: null },
    { label: 'Padel', value: 'PADEL', emoji: null, svgIcon: Images.PaddleIcon },
    { label: 'Pickleball', value: 'PICKELBALL', emoji: null, svgIcon: Images.PickeBallIcon },
];

export function SportChips({ selected, onSelect }: SportChipsProps) {
    return (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {sports.map((sport) => (
                <button
                    key={sport.label}
                    onClick={() => onSelect(sport.value)}
                    className={cn(
                        'flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors',
                        selected === sport.value
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'bg-card text-muted-foreground border',
                    )}
                >
                    {sport.svgIcon
                        ? <img src={sport.svgIcon} alt={sport.label} className="w-4 h-4" />
                        : <span>{sport.emoji}</span>
                    }
                    <span>{sport.label}</span>
                </button>
            ))}
        </div>
    );
}
