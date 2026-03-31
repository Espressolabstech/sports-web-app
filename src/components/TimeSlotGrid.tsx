import { cn } from '../utils/twMerge';

interface TimeSlot {
    startTime: string;
    endTime: string;
    status: 'available' | 'booked' | 'blocked';
}

interface TimeSlotGridProps {
    slots: TimeSlot[];
    selectedSlots: string[];
    onSelect: (startTime: string) => void;
}

export function TimeSlotGrid({
    slots,
    selectedSlots,
    onSelect,
}: TimeSlotGridProps) {
    return (
        <div className="grid grid-cols-3 gap-2">
            {slots.map((slot) => {
                const isAvailable = slot.status === 'available';
                const isSelected = selectedSlots.includes(slot.startTime);

                return (
                    <button
                        key={slot.startTime}
                        disabled={!isAvailable}
                        onClick={() => onSelect(slot.startTime)}
                        className={cn(
                            'rounded-lg border px-3 py-3 text-center text-sm font-medium transition-all',
                            isAvailable &&
                                !isSelected &&
                                'border-success/30 bg-success/10 text-success hover:bg-success/20',
                            isSelected &&
                                'border-primary bg-primary text-primary-foreground shadow-sm',
                            slot.status === 'booked' &&
                                'border-border bg-muted text-muted-foreground cursor-not-allowed opacity-60',
                            slot.status === 'blocked' &&
                                'border-border bg-muted/50 text-muted-foreground/50 cursor-not-allowed',
                        )}
                    >
                        <div>{slot.startTime}</div>
                        <div className="text-xs opacity-75">
                            {isAvailable
                                ? 'Available'
                                : slot.status === 'booked'
                                  ? 'Booked'
                                  : 'Blocked'}
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
