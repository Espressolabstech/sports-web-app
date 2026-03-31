import { format, addDays, isSameDay } from 'date-fns';
import { cn } from '../utils/twMerge';

interface DateStripProps {
    selected: Date;
    onSelect: (date: Date) => void;
}

export function DateStrip({ selected, onSelect }: DateStripProps) {
    const today = new Date();
    const dates = Array.from({ length: 14 }, (_, i) => addDays(today, i));

    return (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {dates.map((date) => {
                const isSelected = isSameDay(date, selected);
                return (
                    <button
                        key={date.toISOString()}
                        onClick={() => onSelect(date)}
                        className={cn(
                            'flex min-w-[52px] flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-sm transition-colors',
                            isSelected
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'bg-card text-muted-foreground border hover:bg-accent',
                        )}
                    >
                        <span className="text-xs font-medium">
                            {format(date, 'EEE')}
                        </span>
                        <span className="text-lg font-bold">
                            {format(date, 'd')}
                        </span>
                        <span className="text-xs">{format(date, 'MMM')}</span>
                    </button>
                );
            })}
        </div>
    );
}
