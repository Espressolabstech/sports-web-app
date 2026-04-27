import { format, addDays, isSameDay } from 'date-fns';
import { cn } from '../utils/twMerge';

interface DateStripProps {
    selected: Date;
    onSelect: (date: Date) => void;
    /** 'yyyy-MM-dd' strings — dates that have slot selections (show green dot) */
    markedDates?: string[];
}

export function DateStrip({ selected, onSelect, markedDates = [] }: DateStripProps) {
    const today = new Date();
    const dates = Array.from({ length: 14 }, (_, i) => addDays(today, i));
    const markedSet = new Set(markedDates);

    return (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {dates.map((date) => {
                const ds = format(date, 'yyyy-MM-dd');
                const isSelected = isSameDay(date, selected);
                const isMarked = markedSet.has(ds) && !isSelected;
                return (
                    <button
                        key={date.toISOString()}
                        onClick={() => onSelect(date)}
                        className={cn(
                            'relative flex min-w-[52px] flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-sm transition-colors',
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
                        {/* Green dot for dates with selections */}
                        {isMarked && (
                            <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-green-500" />
                        )}
                    </button>
                );
            })}
        </div>
    );
}
