import { LayoutGrid } from 'lucide-react';
import { cn } from '../utils/twMerge';

function PadelIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="9" rx="5.5" ry="7" />
            <line x1="12" y1="16" x2="12" y2="23" />
            <line x1="9" y1="5" x2="9" y2="13" />
            <line x1="15" y1="5" x2="15" y2="13" />
            <line x1="7" y1="9" x2="17" y2="9" />
            <circle cx="12" cy="9" r="1" fill="currentColor" stroke="none" />
        </svg>
    );
}

function PickleballIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="6" y="1" width="12" height="14" rx="6" />
            <line x1="12" y1="15" x2="12" y2="23" />
            <circle cx="10" cy="7" r="0.8" fill="currentColor" stroke="none" />
            <circle cx="14" cy="7" r="0.8" fill="currentColor" stroke="none" />
            <circle cx="10" cy="11" r="0.8" fill="currentColor" stroke="none" />
            <circle cx="14" cy="11" r="0.8" fill="currentColor" stroke="none" />
            <circle cx="12" cy="9" r="0.8" fill="currentColor" stroke="none" />
        </svg>
    );
}

function TennisIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="7" r="5.5" />
            <path d="M7.2 4.3 Q12 7 16.8 4.3" />
            <path d="M7.2 9.7 Q12 7 16.8 9.7" />
            <line x1="12" y1="12.5" x2="12" y2="23" />
            <line x1="10.5" y1="14" x2="13.5" y2="14" />
        </svg>
    );
}

function BadmintonIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="6" rx="4.5" ry="5" />
            <line x1="9" y1="3" x2="9" y2="9" />
            <line x1="12" y1="2" x2="12" y2="10" />
            <line x1="15" y1="3" x2="15" y2="9" />
            <line x1="8" y1="6" x2="16" y2="6" />
            <line x1="12" y1="11" x2="12" y2="23" />
            <circle cx="12" cy="22" r="1.2" fill="currentColor" stroke="none" />
        </svg>
    );
}

function FootballIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <polygon points="12,5 14.5,9.5 12,14 9.5,9.5" />
            <line x1="12" y1="14" x2="12" y2="21" />
            <line x1="9.5" y1="9.5" x2="3.5" y2="8.5" />
            <line x1="14.5" y1="9.5" x2="20.5" y2="8.5" />
        </svg>
    );
}

type SportEntry = {
    label: string;
    value: string;
    Icon: React.ComponentType<{ className?: string }>;
};

const sports: SportEntry[] = [
    { label: 'All',        value: 'All',        Icon: LayoutGrid    },
    { label: 'Padel',      value: 'PADEL',      Icon: PadelIcon     },
    { label: 'Pickleball', value: 'PICKELBALL', Icon: PickleballIcon },
    { label: 'Tennis',     value: 'TENNIS',     Icon: TennisIcon    },
    { label: 'Badminton',  value: 'BADMINTON',  Icon: BadmintonIcon  },
    { label: 'Football',   value: 'FOOTBALL',   Icon: FootballIcon   },
];

export function SportChips({ selected, onSelect }: SportChipsProps) {
    return (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {sports.map(({ label, value, Icon }) => {
                const active = selected === value;
                return (
                    <button
                        key={value}
                        onClick={() => onSelect(value)}
                        className={cn(
                            'flex items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-all',
                            active
                                ? 'border-foreground bg-foreground text-background shadow-sm'
                                : 'border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground',
                        )}
                    >
                        <Icon className="h-4 w-4" />
                        <span>{label}</span>
                    </button>
                );
            })}
        </div>
    );
}
